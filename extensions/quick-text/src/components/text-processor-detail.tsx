import { Color, List, showToast, Toast } from "@raycast/api";
import type { GenerateRequest, ModelResponse } from "ollama";
import { type Dispatch, useEffect, useMemo, useState } from "react";
import { useOllama } from "@/hooks";
import { formatSize, RELOAD_HINT } from "@/utils";

interface TextProcessorDetailProps {
  selectedModel: ModelResponse;
  selectedText: string;
  request: Omit<GenerateRequest, "stream">;
  setParentProcessedText: Dispatch<React.SetStateAction<string | null>>;
  metadata?: Record<
    string,
    | string
    | {
        value: string;
        color?: Color | null;
      }
  >;
}

export function TextProcessorDetail({
  selectedModel,
  selectedText,
  request,
  setParentProcessedText,
  metadata,
}: TextProcessorDetailProps) {
  const ollama = useOllama();
  const [processedText, setProcessedText] = useState<string>("");
  const [thinkingText, setThinkingText] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function processText() {
      setIsLoading(true);
      setIsThinking(false);
      setThinkingText("");
      setProcessedText("");
      setParentProcessedText(null);

      let fullResponseText = "";
      let fullThinkingText = "";

      try {
        const stream = await ollama.generate({ ...request, stream: true });

        for await (const chunk of stream) {
          if (isCancelled) {
            stream.abort();
            break;
          }

          if (chunk.thinking) {
            setIsThinking(true);
            fullThinkingText += chunk.thinking;
            setThinkingText(fullThinkingText);
          } else if (chunk.response) {
            setIsThinking(false);
            fullResponseText += chunk.response;
            setProcessedText(fullResponseText);
            setParentProcessedText(fullResponseText);
          }
        }
      } catch (err) {
        if (isCancelled) return;
        const errorMsg = err instanceof Error ? err.message : String(err);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to process text",
          message: errorMsg,
        });
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    processText();

    return () => {
      isCancelled = true;
    };
  }, [request]);

  const markdown = useMemo(() => {
    const quote = thinkingText
      ? `> ${thinkingText.replaceAll("\n", "\n> ")}\n\n`
      : "";
    return `${quote}${processedText}` || " "; // simulate empty with space
  }, [thinkingText, processedText]);

  return (
    <List.Item.Detail
      markdown={markdown}
      isLoading={isLoading || isThinking}
      metadata={
        <List.Item.Detail.Metadata>
          {metadata && (
            <>
              {Object.entries(metadata).map(([key, value]) => (
                <List.Item.Detail.Metadata.Label
                  key={key}
                  title={key}
                  text={value}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label
            title={`Selected · (${RELOAD_HINT})`}
            text={{
              value: selectedText,
              color: Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Model"
            text={selectedModel.name}
          />
          <List.Item.Detail.Metadata.Label
            title="Size"
            text={formatSize(selectedModel.size)}
          />
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={new Date(selectedModel.modified_at).toDateString()}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
