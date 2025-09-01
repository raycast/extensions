import { getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { useChatHistory } from "./useChatHistory";
import { showFailureToast } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import { PreferenceModel } from "../models/preference.model";
import { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat";
import { isVisionModel } from "../utils";

const { defaultModel, customModel, prompt: systemPrompt, apiKey } = getPreferenceValues<PreferenceModel>();
const model = customModel?.trim() || defaultModel;

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.x.ai/v1",
});

export function useGrok(prompt: string, launchContext?: LaunchProps["launchContext"]) {
  const { addToHistory } = useChatHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [textStream, setTextStream] = useState<string>("");
  const [lastQuery, setLastQuery] = useState<string>(launchContext?.context || launchContext?.fallbackText || "");

  // Memoize the prompt to ensure stable reference
  const stablePrompt = useMemo(() => prompt, [prompt]);

  const submit = useCallback(
    async (query: string, imageFiles?: Buffer[]) => {
      if (query.trim() === "") {
        return;
      }

      // Check if images are provided but model doesn't support vision
      if (imageFiles && imageFiles.length > 0 && !isVisionModel(model)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Model doesn't support images",
          message: `${model} is a text-only model. Please use a vision model like grok-2-vision-1212 or grok-beta to analyze images.`,
        });
        return;
      }

      try {
        const start = Date.now();
        setIsLoading(true);
        let delta = "";
        setLastQuery(query);

        // Prepare messages with image support
        const messages: ChatCompletionMessageParam[] = [{ role: "system", content: stablePrompt || systemPrompt }];

        // If we have images, create a message with both text and images
        if (imageFiles && imageFiles.length > 0) {
          const content: ChatCompletionContentPart[] = [{ type: "text", text: query }];

          // Add images to the content
          imageFiles.forEach(imageBuffer => {
            const base64Image = imageBuffer.toString("base64");

            // Detect image format from the first few bytes (magic numbers)
            let mimeType = "image/jpeg"; // default fallback

            // Check magic numbers to determine actual image format
            if (
              imageBuffer[0] === 0x89 &&
              imageBuffer[1] === 0x50 &&
              imageBuffer[2] === 0x4e &&
              imageBuffer[3] === 0x47
            ) {
              mimeType = "image/png";
            } else if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff) {
              mimeType = "image/jpeg";
            } else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46) {
              mimeType = "image/gif";
            } else if (
              imageBuffer[0] === 0x52 &&
              imageBuffer[1] === 0x49 &&
              imageBuffer[2] === 0x46 &&
              imageBuffer[3] === 0x46
            ) {
              mimeType = "image/webp";
            } else if (imageBuffer[0] === 0x42 && imageBuffer[1] === 0x4d) {
              mimeType = "image/bmp";
            } else if (
              imageBuffer.slice(4, 12).toString() === "ftypheic" ||
              imageBuffer.slice(4, 12).toString() === "ftypmif1"
            ) {
              mimeType = "image/heic";
            }

            content.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            });
          });

          messages.push({
            role: "user",
            content: content,
          });
        } else {
          // Text-only message
          messages.push({
            role: "user",
            content: query,
          });

          console.debug(messages);
        }

        const completion = await client.chat.completions.create({
          model: model,
          stream: true,
          max_completion_tokens: 1024 * 10,
          messages: messages,
        });
        for await (const chunk of completion) {
          const finish_reason = chunk.choices[0].finish_reason;
          const content = chunk.choices[0].delta?.content || "";
          switch (finish_reason) {
            case "stop": {
              // 正常结束，返回完整的翻译结果
              const end = Date.now();
              const duration = end - start;
              await addToHistory(query, delta, model);
              await showToast({
                style: Toast.Style.Success,
                title: "Response Finished",
                message: `Completed in ${duration / 1000}s`,
              });
              setIsLoading(false);
              break;
            }
            case "length":
              // 达到最大长度限制
              delta += "\n[翻译被截断：达到最大长度限制]";
              setTextStream(delta);
              break;
            case "content_filter":
              // 内容被过滤
              delta += "\n[翻译被过滤：可能包含不适当内容]";
              setTextStream(delta);
              break;
            case "tool_calls":
            case "function_call":
              // API调用相关，一般不会在翻译中出现
              delta += "\n[不支持的响应类型]";
              setTextStream(delta);
              break;
            default:
              // 继续累积翻译内容
              delta += content;
              setTextStream(delta);
              break;
          }
        }
      } catch (error) {
        showFailureToast(error);
        setIsLoading(false);
      }
    },
    [addToHistory, stablePrompt]
  );

  return {
    textStream,
    isLoading,
    lastQuery,
    submit,
  };
}
