import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { useChatGPT } from "../hooks/useChatGPT";
import { AskImageProps, Model } from "../type";
import { resolveAuthStatus } from "../utils/auth";
import { toUnit } from "../utils";
import { AuthGate } from "./auth-required";
import { LoadFrom, loadFromClipboard, loadFromFinder } from "../utils/load";
import { countImageTokens, countToken } from "../utils/token";
import { DEFAULT_MODEL_OPTION, isModelId, normalizeAvailableOptions, resolveModelOption } from "../utils/model-support";
import { listCodexAppServerModels } from "../utils/codex-app-server";
import { requestCodexResponse } from "../utils/codex-responses";

function bufferToDataUrl(mimeType: string, buffer: Buffer) {
  const base64String = buffer.toString("base64");
  return `data:${mimeType};base64,${base64String}`;
}

export function VisionView(props: AskImageProps) {
  return (
    <AuthGate>
      <VisionViewWithAuth {...props} />
    </AuthGate>
  );
}

function VisionViewWithAuth(props: AskImageProps) {
  const preferences = getPreferenceValues<Preferences>();
  const visionModelName =
    (preferences.useVisionModel &&
      preferences.visionModelName &&
      isModelId(preferences.visionModelName) &&
      preferences.visionModelName) ||
    DEFAULT_MODEL_OPTION;

  const VISION_MODEL: Model = {
    id: visionModelName,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Default",
    prompt: "You are a helpful vision assistant.",
    option: visionModelName,
    temperature: "1",
    enableReasoningEffortChange: false,
    reasoningEffort: "medium",
    pinned: false,
    vision: true,
  };

  const chatGPT = useChatGPT({ allowMissingApiKey: true });
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

  async function getChatResponse(prompt: string) {
    try {
      let data: LoadFrom | undefined;

      if (load === "selected") {
        data = await loadFromFinder();
      } else {
        data = await loadFromClipboard();
      }

      if (!data) {
        await showToast({ style: Toast.Style.Failure, title: "Error" });
        setLoading(false);
        setResponse("## ⚠️ Data couldn't load. Check image selection or clipboard and try again.");
        return;
      }
      const auth = await resolveAuthStatus();
      const imageWidth = data.type.width;
      const imageHeight = data.type.height;
      setImageMeta({ height: imageHeight, width: imageWidth, size: data.data.length });
      setImagePromptTokenCount(countImageTokens(imageWidth, imageHeight));
      setPromptTokenCount(countToken(VISION_MODEL.prompt + prompt));

      if (auth.provider === "chatgpt") {
        const models = await listCodexAppServerModels();
        const available = normalizeAvailableOptions(
          models.filter((model) => !model.hidden).map((model) => model.model || model.id),
        );
        if (available.length === 0) throw new Error("Your ChatGPT account has no available models.");
        const model = resolveModelOption(VISION_MODEL.option, available);
        const result = await requestCodexResponse({
          model,
          messages: [{ role: "user", content: prompt || "Describe this image:" }],
          instructions: VISION_MODEL.prompt,
          imagePaths: [data.path],
          stream: useStream,
          onDelta: (delta) => setResponse((previous) => previous + delta),
        });
        return result.text;
      }

      if (!chatGPT) throw new Error("Add an API key or sign in with ChatGPT to use image commands.");
      const imageUrl = bufferToDataUrl(`image/${data.type}`, data.data);

      const request = {
        model: VISION_MODEL.option,
        instructions: VISION_MODEL.prompt,
        input: [
          {
            role: "user" as const,
            content: [
              { type: "input_text" as const, text: prompt || "Describe this image:" },
              { type: "input_image" as const, image_url: imageUrl, detail: "auto" as const },
            ],
          },
        ],
        store: false,
      };
      const streamOrCompletion = useStream
        ? await chatGPT.responses.create({ ...request, stream: true })
        : await chatGPT.responses.create({ ...request, stream: false });

      return streamOrCompletion;
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Error" });
      setLoading(false);
      setResponse(
        "## ⚠️ Could not understand the image. \n\n" + `Error Message: \n\n \`\`\`${(error as Error).message}\`\`\``,
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

    if (typeof resp === "string") {
      appendResponse(resp);
    } else if (useStream) {
      for await (const event of resp as AsyncIterable<{ type: string; delta?: string }>) {
        if (event.type === "response.output_text.delta") appendResponse(event.delta ?? "");
      }
    } else if ("output_text" in resp) {
      appendResponse(resp.output_text);
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
              </>
            )}
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
