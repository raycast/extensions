import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { global_model, enable_streaming, openai } from "./configAPI";
import { allModels as changeModels, currentDate, countToken } from "./utils";
import { buildAgentRequest, runAgent, sendsTemperature, targetLabel, Citation } from "./agent";
import { ResultViewProps } from "./ResultView.types";
import OpenAI from "openai";

const formatUserMessage = (message: string): string =>
  message
    .split("\n")
    .map((line) => `>${line}`)
    .join("\n");

export default function ResultView(props: ResultViewProps) {
  const { sys_prompt, selected_text, user_extra_msg, model_override, toast_title, temperature } = props;
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [returnedCitations, setReturnedCitations] = useState<Citation[]>([]);
  const [metrics, setMetrics] = useState({
    promptTokens: 0,
    responseTokens: 0,
    cumulativeTokens: 0,
    cumulativeCost: 0,
    cost: 0,
    model: model_override === "global" ? global_model : model_override,
    temp: temperature ?? 0.8,
  });

  async function getResult(newModel?: string, newTemp?: number) {
    const startTime = Date.now();
    const toast = await showToast(Toast.Style.Animated, toast_title);

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
      setMetrics((m) => ({ ...m, model, temp }));
      const fullSysPrompt = `Current date: ${currentDate}.\n\n${sys_prompt}`;
      const userPrompt = `${user_extra_msg ? `${user_extra_msg.trim()}\n\n` : ""}${selectedText ? `The following is the text:\n"${selectedText.trim()}"` : ""}`;
      setMetrics((m) => ({ ...m, promptTokens: countToken(fullSysPrompt + userPrompt) }));

      const updateResponse = (text: string) => {
        setResponse(text);
        setMetrics((m) => ({ ...m, responseTokens: countToken(text) }));
      };

      const { citations, cost } = await runAgent(
        openai,
        buildAgentRequest({
          target: model,
          instructions: fullSysPrompt,
          turns: [{ role: "user", content: userPrompt }],
          stream: enable_streaming,
          temperature: temp,
        }),
        updateResponse,
      );
      setReturnedCitations(citations);
      const costCents = (cost ?? 0) * 100;

      const duration = (Date.now() - startTime) / 1000;
      toast.style = Toast.Style.Success;
      toast.title = `Finished in ${duration.toFixed(1)}s`;

      setMetrics((m) => ({
        ...m,
        cumulativeTokens: m.cumulativeTokens + m.promptTokens + m.responseTokens,
        cost: costCents,
        cumulativeCost: m.cumulativeCost + costCents,
      }));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof OpenAI.OpenAIError) {
        setResponse(`## ⚠️ API Error\n\`\`\`${error.message}\`\`\``);
      } else if (error instanceof Error) {
        setResponse(`## ⚠️ Error\n\`\`\`${error.message}\`\`\``);
      } else {
        setResponse("⚠️ Unexpected error. Please check your input and connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRetry(options: { newModel?: string; newTemp?: number }) {
    setResponse("");
    setReturnedCitations([]);
    setLoading(true);
    getResult(options.newModel, options.newTemp);
  }

  useEffect(() => {
    getResult();
  }, []);

  const markdownSegments = [];
  if (user_extra_msg) {
    markdownSegments.push(formatUserMessage(user_extra_msg) + "\n\n");
  }

  markdownSegments.push(response);

  const shouldShowCitations = returnedCitations.length > 0 && /\[(web:)?\d+\]/.test(response); // check if citations are returned and referenced
  if (shouldShowCitations) {
    const citationsSection = [
      "\n\n---\n\n**Sources**\n",
      returnedCitations.map((citation) => `${citation.id}. ${citation.url}`).join("\n"),
    ].join("");
    markdownSegments.push(citationsSection);
  }

  return (
    <Detail
      isLoading={loading}
      markdown={markdownSegments.join("")}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
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
              {changeModels
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
            {sendsTemperature(metrics.model) && (
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
            )}
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={targetLabel(metrics.model, changeModels)} />
          {sendsTemperature(metrics.model) && (
            <Detail.Metadata.Label title="Temperature" text={metrics.temp.toFixed(1)} />
          )}
          <Detail.Metadata.Label title="Prompt Tokens" text={metrics.promptTokens.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={metrics.responseTokens.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Total Tokens"
            text={(metrics.promptTokens + metrics.responseTokens).toString()}
          />
          <Detail.Metadata.Label title="Total Cost" text={`${metrics.cost.toFixed(4)}¢`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cumulative Tokens" text={metrics.cumulativeTokens.toString()} />
          <Detail.Metadata.Label title="Cumulative Cost" text={`${metrics.cumulativeCost.toFixed(4)}¢`} />
        </Detail.Metadata>
      }
    />
  );
}
