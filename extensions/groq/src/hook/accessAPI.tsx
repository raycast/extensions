import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { global_model, enable_streaming, openai, show_metadata } from "./configAPI";
import { Stream } from "openai/streaming";
import {
  allModels,
  countToken,
  estimatePrice,
  formatUserMessage,
  isThinkingModel,
  buildSystemPrompt,
  buildUserPrompt,
} from "./utils";
import { ResultViewProps, Metrics } from "./ResultView.types";
import { OpenAIError } from "openai";

export default function ResultView(props: ResultViewProps) {
  const { sys_prompt, selected_text, user_extra_msg, model_override, toast_title, temperature } = props;
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    promptTokens: 0,
    responseTokens: 0,
    model: model_override === "global" ? global_model : model_override,
    temp: temperature ?? 0.7,
  });

  // Memoized chat response function
  const getChatResponse = useCallback(async (sysPrompt: string, selectedText: string, model: string, temp: number) => {
    const fullSysPrompt = buildSystemPrompt(sysPrompt);
    const userPrompt = buildUserPrompt(user_extra_msg, selectedText);
    try {
      const res = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: fullSysPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: temp,
        stream: enable_streaming,
      });
      setMetrics((m) => ({ ...m, promptTokens: countToken(fullSysPrompt + userPrompt) }));
      return res;
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Error" });
      setLoading(false);
      setResponse(`## ⚠️ API Error\n\`\`\`${(error as Error).message}\`\`\``);
    }
  }, []);

  const getResult = useCallback(
    async (newModel?: string, newTemp?: number) => {
      setLoading(true);
      const toast = await showToast(Toast.Style.Animated, toast_title);
      const startTime = Date.now();

      try {
        let selectedText = selected_text;
        if (selectedText === undefined) {
          try {
            selectedText = await getSelectedText();
          } catch (error) {
            console.log(error);
            await showToast({ style: Toast.Style.Failure, title: "Error" });
            setLoading(false);
            setResponse(
              "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again.",
            );
            return;
          }
        }

        const model = newModel || metrics.model;
        const temp = newTemp ?? metrics.temp;
        setMetrics((m) => ({ ...m, model: model, temp: temp }));
        const response = await getChatResponse(sys_prompt, selectedText, model, temp);
        if (!response) return;

        const closingTag = "</think>";
        const closingLen = closingTag.length;

        let startedOutput = !isThinkingModel(model);
        let searchBuffer = ""; // rolling buffer to detect closingTag across chunk boundaries

        const processChunk = (part: string) => {
          if (!part) return;

          // count tokens
          setMetrics((m) => ({ ...m, responseTokens: m.responseTokens + countToken(part) }));

          if (!startedOutput) {
            const combined = searchBuffer + part;
            const idx = combined.indexOf(closingTag);
            if (idx !== -1) {
              startedOutput = true;
              const after = combined.slice(idx + closingLen);
              setResponse(after);
              searchBuffer = "";
            } else {
              setResponse((prev) => prev + part);
              // detect closingTag across chunk boundaries
              const keep = Math.min(combined.length, closingLen - 1);
              searchBuffer = combined.slice(combined.length - keep);
            }
            return;
          }

          // past closingTag or non-thinking model -> append directly
          setResponse((prev) => prev + part);
        };

        if (response instanceof Stream) {
          for await (const part of response) {
            processChunk(part.choices[0]?.delta?.content ?? "");
          }
        } else {
          const whole = response.choices[0]?.message?.content ?? "";
          // count tokens
          setMetrics((m) => ({ ...m, responseTokens: m.responseTokens + countToken(whole) }));

          if (isThinkingModel(model)) {
            const idx = whole.indexOf(closingTag);
            const visible = idx === -1 ? "" : whole.slice(idx + closingLen);
            setResponse(visible);
          } else {
            setResponse(whole);
          }
        }

        const duration = (Date.now() - startTime) / 1000;
        toast.style = Toast.Style.Success;
        toast.title = `Finished in ${duration.toFixed(1)}s`;
      } catch (error) {
        if (error instanceof OpenAIError) {
          setResponse(`## ⚠️ API Error\n\`\`\`${error.message}\`\`\``);
        } else {
          setResponse("⚠️ Unexpected error. Please check your input and connection.");
        }
      } finally {
        setLoading(false);
      }
    },
    [metrics.model, metrics.temp],
  );

  function handleRetry(options: { newModel?: string; newTemp?: number }) {
    setResponse("");
    setLoading(true);
    setMetrics((m) => ({ ...m, responseTokens: 0 }));
    getResult(options.newModel, options.newTemp);
  }

  useEffect(() => {
    getResult();
  }, []);

  let markdown = "";
  if (user_extra_msg) {
    markdown += formatUserMessage(user_extra_msg) + "\n\n";
  }
  markdown += response;

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response.trim()} />
            <Action.Paste title="Paste Results" content={response.trim()} />
            <Action
              title="Retry"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => handleRetry({})}
            />
            <ActionPanel.Submenu
              title="Retry with Model"
              icon={Icon.ArrowNe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            >
              {allModels
                .filter((m) => m.id !== metrics.model && m.id !== "global")
                .map((m) => (
                  <Action
                    key={m.id}
                    title={m.name}
                    icon={Icon.ChevronRight}
                    onAction={() => handleRetry({ newModel: m.id })}
                  />
                ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu
              title="Temperature"
              icon={Icon.Temperature}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            >
              {[0.2, 0.4, 0.5, 0.7, 0.8, 0.9, 1.0, 1.2].map((t) => (
                <Action
                  key={t}
                  icon={{
                    source:
                      t <= 0.25
                        ? Icon.Signal0
                        : t <= 0.5
                          ? Icon.Signal1
                          : t <= 0.75
                            ? Icon.Signal2
                            : t <= 1
                              ? Icon.Signal3
                              : Icon.FullSignal,
                  }}
                  title={t.toFixed(1)}
                  onAction={() => handleRetry({ newTemp: t })}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel>
        )
      }
      metadata={
        show_metadata && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={allModels.filter((m) => m.id === metrics.model)[0].name} />
            <Detail.Metadata.Label title="Temperature" text={metrics.temp.toFixed(2)} />
            <Detail.Metadata.Label title="Prompt Tokens" text={metrics.promptTokens.toString()} />
            <Detail.Metadata.Label title="Response Tokens" text={metrics.responseTokens.toString()} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Total Tokens"
              text={(metrics.promptTokens + metrics.responseTokens).toString()}
            />
            <Detail.Metadata.Label
              title="Total Cost"
              text={`${estimatePrice(metrics.promptTokens, metrics.responseTokens, metrics.model).toFixed(4)}¢`}
            />
          </Detail.Metadata>
        )
      }
    />
  );
}
