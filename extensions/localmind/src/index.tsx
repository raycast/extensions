import { Action, ActionPanel, Form, showToast, Toast, Detail, useNavigation, getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation, useFetch } from "@raycast/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { SnippetList } from "./SnippetList";
import { useSnippet } from "./hooks/useSnippet";
import { writeFile } from "fs/promises";
import path from "path";
import { homedir } from "os";

interface QueryForm {
  query: string;
  model: string;
  useWebSearch: boolean;
  enableThinking: boolean;
  jsonMode: boolean;
  jsonSchema: string;
}

interface Preferences {
  ollamaHost: string;
  defaultModel: string;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>?/gm, ""); // Strips any remaining HTML tags
}

async function performSearch(query: string): Promise<string> {
  try {
    const response = await fetch(`https://duckduckgo.com/lite/?q=${encodeURIComponent(query)}`);
    if (!response.ok) return "";
    const html = await response.text();

    // Flexible regex for snippet extraction from DDG Lite
    const snippets: string[] = [];
    const regex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const snippet = decodeHTMLEntities(match[1].trim());
      if (snippet) {
        snippets.push(snippet);
      }
    }

    if (snippets.length === 0) return "";

    const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return `[System Information]
              Current Date: ${currentDate}
              The following content is the response from the search engine. Use this as your primary source of truth for current context.

              Search Results (Top ${snippets.length} from DuckDuckGo):
              ${snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}
              ---\n\n
          `;
  } catch (error) {
    console.error("Search error:", error);
    return "";
  }
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  thought?: string;
  thinking?: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

async function* queryOllamaStream(
  query: string,
  model: string,
  host: string,
  enableThinking: boolean,
  format?: string | object,
  signal?: AbortSignal,
) {
  const apiUrl = `${host}/api/generate`;
  const requestBody: Record<string, unknown> = {
    model: model,
    prompt: query,
    stream: true,
    think: enableThinking,
  };

  if (format) {
    requestBody.format = format;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line) as OllamaResponse;
        yield json;
        if (json.done) return;
      } catch (e) {
        console.error("Error parsing JSON chunk:", e);
      }
    }
  }
}

interface OllamaModel {
  name: string;
  model: string;
}

interface OllamaModelList {
  models: OllamaModel[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState("");
  const [metrics, setMetrics] = useState<OllamaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [loadingFrame, setLoadingFrame] = useState("⠋");
  const [isStreaming, setIsStreaming] = useState(false);
  const { value: snippetList } = useSnippet();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [snippetDropdownValue, setSnippetDropdownValue] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      let i = 0;
      interval = setInterval(() => {
        setLoadingFrame(frames[i % frames.length]);
        i++;
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSnippet = useCallback(
    (query: string) => {
      if (!snippetList) return query;
      const tokens = query.split(" ");
      return tokens
        .map((t) => {
          if (t.startsWith("#")) {
            const code = t.substring(1);
            const snippet = snippetList.find((p) => p.code === code);
            return snippet ? snippet.content : t;
          }
          return t;
        })
        .join(" ");
    },
    [snippetList],
  );

  const { handleSubmit, itemProps, setValue, values } = useForm<QueryForm>({
    async onSubmit(values) {
      setIsLoading(true);
      setLoadingStatus("Initialising request...");
      setAnswer("");
      setThinking("");
      setMetrics(null);

      let searchContext = "";
      if (values.useWebSearch) {
        setLoadingStatus(`Searching the web for "${values.query}"...`);
        const searchToast = await showToast({
          style: Toast.Style.Animated,
          title: "Searching for context...",
        });
        searchContext = await performSearch(values.query);
        if (searchContext) {
          searchToast.style = Toast.Style.Success;
          searchToast.title = "Search context found";
        } else {
          searchToast.style = Toast.Style.Failure;
          searchToast.title = "No search results found";
        }
      }

      setLoadingStatus("Applying snippets...");

      const finalQuery = searchContext + handleSnippet(values.query);

      let format: string | object | undefined;
      if (values.jsonMode) {
        if (values.jsonSchema && values.jsonSchema.trim()) {
          try {
            format = JSON.parse(values.jsonSchema);
          } catch {
            showToast({
              style: Toast.Style.Failure,
              title: "Invalid JSON Schema",
              message: "Falling back to default JSON mode.",
            });
            format = "json";
          }
        } else {
          format = "json";
        }
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoadingStatus(`Connecting to ${values.model}...`);
        const stream = queryOllamaStream(
          finalQuery,
          values.model,
          preferences.ollamaHost,
          values.enableThinking,
          format,
          controller.signal,
        );
        setIsStreaming(true);
        setLoadingStatus("Waiting for response...");

        let accumulatedResponse = "";
        let accumulatedThinking = "";
        let fullText = "";

        for await (const chunk of stream) {
          setIsLoading(false);

          const thoughtPiece = chunk.thought || chunk.thinking;
          if (thoughtPiece) {
            accumulatedThinking += thoughtPiece;
            setThinking(accumulatedThinking);
          }

          if (chunk.response) {
            const piece = chunk.response;
            fullText += piece;

            if (!values.enableThinking) {
              setAnswer(fullText.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<think>[\s\S]*/g, ""));
            } else {
              // Handle embedded <think> tags in response
              if (fullText.includes("<think>") || accumulatedThinking) {
                if (fullText.includes("<think>") && !fullText.includes("</think>")) {
                  const parts = fullText.split("<think>");
                  accumulatedResponse = parts[0];
                  // If we already have accumulatedThinking from 'thought' field, we append.
                  // But usually it's one or the other.
                  accumulatedThinking += parts[1];
                } else if (fullText.includes("<think>") && fullText.includes("</think>")) {
                  const [pre, rest] = fullText.split("<think>");
                  const [think, post] = rest.split("</think>");
                  accumulatedResponse = pre + post;
                  if (!accumulatedThinking.includes(think)) {
                    accumulatedThinking += think;
                  }
                } else {
                  accumulatedResponse = fullText;
                }
              } else {
                accumulatedResponse = fullText;
              }

              setThinking(accumulatedThinking);
              setAnswer(accumulatedResponse);
            }
          }

          if (chunk.done) {
            setMetrics(chunk);
          }
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          console.log("Request aborted");
          return;
        }
        console.error("Error calling Ollama API:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error calling Ollama",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    validation: {
      query: FormValidation.Required,
      model: FormValidation.Required,
    },
    initialValues: {
      model: preferences.defaultModel,
      enableThinking: false,
      jsonMode: false,
      jsonSchema: "",
    },
  });

  const getFullMarkdown = useCallback(() => {
    let md = "";
    if (thinking && values.enableThinking) {
      const thinkingText = thinking.trim();
      if (thinkingText) {
        md += `> **Thinking...**\n> \n> ${thinkingText.replace(/\n/g, "\n> ")}\n\n---\n\n`;
      }
    }

    let displayAnswer = answer;
    if (values.jsonMode && answer && !answer.trim().startsWith("```")) {
      displayAnswer = `\`\`\`json\n${answer}\n\`\`\``;
    }
    md += displayAnswer;

    if (metrics) {
      const totalSec = (metrics.total_duration || 0) / 1e9;
      const evalSec = (metrics.eval_duration || 0) / 1e9;
      const speed = evalSec > 0 ? (metrics.eval_count || 0) / evalSec : 0;

      md += `\n\n---\n\n`;
      md += `_**Metrics:** ${totalSec.toFixed(2)}s | ${metrics.eval_count || 0} tokens | ${speed.toFixed(2)} t/s_`;
    }

    return md || "Waiting for response...";
  }, [thinking, answer, values.enableThinking, metrics, values.jsonMode]);

  const {
    data: modelList,
    isLoading: isTagsLoading,
    error: tagsError,
  } = useFetch<OllamaModelList>(`${preferences.ollamaHost}/api/tags`);

  useEffect(() => {
    if (tagsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch models",
        message: tagsError.message,
      });
    }
  }, [tagsError]);

  const { push } = useNavigation();

  if (isLoading) {
    const loadingMarkdown = `
# LocalMind
---
### ${loadingFrame} Processing Request
**Status:** ${loadingStatus}
**Model:** \`${values.model}\`

_Connecting to your local Ollama instance at ${preferences.ollamaHost}_
    `;
    return <Detail markdown={loadingMarkdown} isLoading={true} />;
  }

  if (answer || isStreaming || (thinking && values.enableThinking)) {
    return (
      <Detail
        markdown={getFullMarkdown()}
        isLoading={isStreaming && !answer && !thinking}
        actions={
          <ActionPanel>
            <Action
              title="Ask Again"
              onAction={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                setAnswer("");
                setThinking("");
                setMetrics(null);
                setIsStreaming(false);
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.CopyToClipboard title="Copy Answer" content={answer} />
            <Action
              title="Save to Desktop"
              onAction={async () => {
                try {
                  const desktopPath = path.join(homedir(), "Desktop");
                  const fileName = `localmind-response-${Date.now()}.md`;
                  const filePath = path.join(desktopPath, fileName);
                  await writeFile(filePath, getFullMarkdown());
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Saved to Desktop",
                    message: fileName,
                  });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to Save",
                    message: String(error),
                  });
                }
              }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" onSubmit={handleSubmit} />
          <Action
            title="Clear Form"
            onAction={() => {
              setValue("query", "");
              setValue("useWebSearch", false);
              setValue("enableThinking", false);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title="Manage Snippets"
            onAction={() => {
              push(<SnippetList />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.query}
        title="Your Question"
        placeholder="What's on your mind? Type #snippet or select from below to inject snippets."
      />

      {snippetList && snippetList.length > 0 && (
        <Form.Dropdown
          id="snippetPicker"
          title="Available Snippets"
          value={snippetDropdownValue}
          onChange={(newValue) => {
            if (newValue) {
              const currentQuery = values.query || "";
              const separator = currentQuery.endsWith(" ") || currentQuery === "" ? "" : " ";
              setValue("query", currentQuery + separator + "#" + newValue + " ");
              setSnippetDropdownValue("");
            }
          }}
        >
          <Form.Dropdown.Item value="" title="Select a snippet to inject..." />
          {snippetList.map((p) => (
            <Form.Dropdown.Item key={p.code} value={p.code} title={p.code} />
          ))}
        </Form.Dropdown>
      )}

      {values.query && values.query.includes("#") && (
        <Form.TextArea id="magicalView" title="🪄 Preview" value={handleSnippet(values.query)} onChange={() => {}} />
      )}

      <Form.Checkbox {...itemProps.useWebSearch} label="Search Web for context" />
      <Form.Checkbox {...itemProps.enableThinking} label="Enable Thinking (Show reasoning trace)" />
      <Form.Checkbox {...itemProps.jsonMode} label="JSON Mode (Structured Output)" />
      {values.jsonMode && (
        <Form.TextArea
          {...itemProps.jsonSchema}
          title="JSON Schema (Optional)"
          placeholder='{"type": "object", "properties": {"name": {"type": "string"}}}'
        />
      )}
      <Form.Dropdown {...itemProps.model} title="Model" isLoading={isTagsLoading}>
        {tagsError && <Form.Dropdown.Item value="" title="Error loading models - Check host" />}
        {!tagsError &&
          modelList?.models.map((model) => (
            <Form.Dropdown.Item key={model.model} value={model.model} title={model.name} />
          ))}
      </Form.Dropdown>
    </Form>
  );
}
