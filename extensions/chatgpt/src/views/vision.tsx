import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Stream } from "openai/streaming";
import { useEffect, useState } from "react";

import { useChatGPT } from "../hooks/useChatGPT";
import { AskImageProps, Model } from "../type";
import { toUnit } from "../utils";
import { LoadFrom, loadFromClipboard, loadFromFinder } from "../utils/load";
import { countImageTokens, countToken, estimateImagePrice, estimatePrice } from "../utils/token";

const preferences = getPreferenceValues<Preferences>();

const visionModelName: string = (preferences.useVisionModel && preferences.visionModelName) || "gpt-4o";

const VISION_MODEL: Model = {
  id: visionModelName,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Default",
  prompt: "You are a helpful vision assistant.",
  option: visionModelName,
  temperature: "1",
  pinned: false,
  vision: true,
};

function bufferToDataUrl(mimeType: string, buffer: Buffer) {
  const base64String = buffer.toString("base64");
  return `data:${mimeType};base64,${base64String}`;
}

export function VisionView(props: AskImageProps) {
  const chatGPT = useChatGPT();
  const [useStream] = useState<boolean>(() => {
    return getPreferenceValues<{
      useStream: boolean;
    }>().useStream;
  });

  const { user_prompt, toast_title, load } = props;
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);

  const [imageMeta, setImageMeta] = useState<{ height: number; width: number; size: number }>({
    height: 0,
    width: 0,
    size: 0,
  });
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [image_prompt_token_count, setImagePromptTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);

  async function getChatResponse(prompt: string) {
    try {
      let data: LoadFrom | undefined;

      if (load === "selected") {
        data = await loadFromFinder();
      } else {
        data = await loadFromClipboard();
      }

      let imageUrl = "";
      if (!data) {
        await showToast({ style: Toast.Style.Failure, title: "Error" });
        setLoading(false);
        setResponse("## ⚠️ Data couldn't load. Check image selection or clipboard and try again.");
        return;
      }
      imageUrl = bufferToDataUrl(`image/${data.type}`, data.data);

      const streamOrCompletion = await chatGPT.chat.completions.create({
        model: VISION_MODEL.option,
        temperature: Number(VISION_MODEL.temperature),
        stream: useStream,
        messages: [
          {
            role: "system",
            content: `${VISION_MODEL.prompt}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${prompt ? prompt : "Describe this image:"}`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      });

      const imageWidth = data.type.width;
      const imageHeight = data.type.height;
      setImageMeta({ height: imageHeight, width: imageWidth, size: data.data.length });
      setImagePromptTokenCount(countImageTokens(imageWidth, imageHeight));
      setPromptTokenCount(countToken(VISION_MODEL.prompt + prompt));
      return streamOrCompletion;
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Error" });
      setLoading(false);
      setResponse(
        "## ⚠️ Issue when accessing the API. \n\n" + `Error Message: \n\n \`\`\`${(error as Error).message}\`\`\``,
      );
      return;
    }
  }

  async function getResult() {
    const now = new Date();
    let duration = 0;
    const toast = await showToast(Toast.Style.Animated, toast_title);

    const resp = await getChatResponse(user_prompt);
    if (!resp) return;

    let response_ = "";
    function appendResponse(part: string) {
      response_ += part;
      setResponse(response_);
      setResponseTokenCount(countToken(response_));
    }

    if (resp instanceof Stream) {
      for await (const part of resp) {
        appendResponse(part.choices[0]?.delta?.content ?? "");
      }
    } else {
      appendResponse(resp.choices[0]?.message?.content ?? "");
    }

    setLoading(false);
    const done = new Date();
    duration = (done.getTime() - now.getTime()) / 1000;
    toast.style = Toast.Style.Success;
    toast.title = `Finished in ${duration} seconds`;
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    if (loading == false) {
      setCumulativeTokens(cumulative_tokens + prompt_token_count + response_token_count + image_prompt_token_count);
      setCumulativeCost(
        cumulative_cost +
          estimatePrice(prompt_token_count, response_token_count, VISION_MODEL.option) +
          estimateImagePrice(image_prompt_token_count),
      );
    }
  }, [loading]);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
          </ActionPanel>
        )
      }
      metadata={
        imageMeta.size || imageMeta.width || imageMeta.height ? (
          <Detail.Metadata>
            {imageMeta.size || imageMeta.width || (imageMeta.height && <Detail.Metadata.Separator />)}
            {imageMeta.size && <Detail.Metadata.Label title="Size" text={toUnit(imageMeta.size)} />}
            {imageMeta.width && <Detail.Metadata.Label title="Width" text={String(imageMeta.width)} />}
            {imageMeta.height && <Detail.Metadata.Label title="Height" text={String(imageMeta.height)} />}
            {cumulative_tokens > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="Cumulative Tokens" text={cumulative_tokens.toString()} />
                <Detail.Metadata.Label title="Cumulative Cost" text={cumulative_cost.toFixed(4) + " ¢"} />
              </>
            )}
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
