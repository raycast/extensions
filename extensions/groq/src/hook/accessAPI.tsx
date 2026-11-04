import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { global_model, enable_streaming, openai, show_metadata } from "./configAPI";
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
import { consumeCompletion } from "./stream-completion";

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

  const activeRequest = useRef<AbortController | undefined>(undefined);

  const getResult = useCallback(
    async (newModel?: string, newTemp?: number) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      const { signal } = controller;
      const model = newModel || metrics.model;
      const temp = newTemp ?? metrics.temp;
      setLoading(true);
      setResponse("");
      setMetrics((m) => ({ ...m, model, temp, promptTokens: 0, responseTokens: 0 }));
      const startTime = Date.now();
      let toast: Toast | undefined;
      let rawResponse = "";

      try {
        toast = await showToast(Toast.Style.Animated, toast_title);
        let selectedText = selected_text;
        if (selectedText === undefined) {
          try {
            selectedText = await getSelectedText();
          } catch {
            throw new Error(
              "Raycast was unable to get the selected text. Try copying the text to a text editor and try again.",
            );
          }
        }
        if (signal.aborted) return;

        const fullSysPrompt = buildSystemPrompt(sys_prompt);
        const userPrompt = buildUserPrompt(user_extra_msg, selectedText);
        const completion = await openai.chat.completions.create(
          {
            model,
            messages: [
              { role: "system", content: fullSysPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: temp,
            stream: enable_streaming,
          },
          { signal },
        );
        if (signal.aborted) return;
        if (show_metadata) {
          const promptTokens = countToken(fullSysPrompt + userPrompt);
          setMetrics((m) => ({ ...m, promptTokens }));
        }
        await consumeCompletion(completion, {
          thinking: isThinkingModel(model),
          signal,
          onUpdate: (text, rawText) => {
            rawResponse = rawText;
            setResponse(text);
          },
        });
        if (signal.aborted) return;

        const duration = (Date.now() - startTime) / 1000;
        toast.style = Toast.Style.Success;
        toast.title = `Finished in ${duration.toFixed(1)}s`;
      } catch (error) {
        if (signal.aborted) return;
        const title = error instanceof OpenAIError ? "API Error" : "Error";
        const message = error instanceof Error ? error.message : "Unexpected error. Please check your connection.";
        setResponse((partial) => `${partial}${partial ? "\n\n" : ""}⚠️ ${title}: ${message}`);
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = title;
          toast.message = message;
        }
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = undefined;
          if (!signal.aborted) {
            if (show_metadata && rawResponse) {
              const responseTokens = countToken(rawResponse);
              setMetrics((m) => ({ ...m, responseTokens }));
            }
            setLoading(false);
          }
        }
        if (signal.aborted) await toast?.hide();
      }
    },
    [metrics.model, metrics.temp, sys_prompt, selected_text, user_extra_msg, toast_title],
  );

  function handleRetry(options: { newModel?: string; newTemp?: number }) {
    void getResult(options.newModel, options.newTemp);
  }

  useEffect(() => {
    void getResult();
    return () => activeRequest.current?.abort();
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
