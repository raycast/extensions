import { Action, ActionPanel, Detail, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TinkererApiClient } from "../api/client";
import { errorMessage, formatJson, isJsonObject, unwrapPayload } from "../lib/json";
import { parsePromptDisplay, PromptDisplay, promptMarkdown } from "../lib/prompt";

interface PromptDetailProps {
  client: TinkererApiClient;
  prompt: PromptDisplay;
}

export function PromptDetail({ client, prompt }: PromptDetailProps) {
  const [detail, setDetail] = useState(prompt);
  const [saved, setSaved] = useState(prompt.saved);
  const [isLoading, setIsLoading] = useState(Boolean(prompt.id));

  useEffect(() => {
    const promptId = prompt.id;
    if (!promptId) return;
    const controller = new AbortController();

    async function loadPrompt(id: string) {
      try {
        const response = await client.call({ path: "prompt.byId", type: "query" }, { id }, controller.signal);
        const payload = unwrapPayload(response);
        const value = isJsonObject(payload) && isJsonObject(payload.prompt) ? payload.prompt : payload;
        const loaded = parsePromptDisplay(value, 0, client.baseUrl);
        const author = loaded.author ?? prompt.author;
        const description = loaded.description ?? prompt.description;
        const kind = loaded.kind ?? prompt.kind;
        const url = loaded.url ?? prompt.url;
        setDetail({
          ...prompt,
          ...loaded,
          ...(author ? { author } : {}),
          ...(description ? { description } : {}),
          id: loaded.id ?? id,
          ...(kind ? { kind } : {}),
          tags: loaded.tags.length > 0 ? loaded.tags : prompt.tags,
          title: loaded.title || prompt.title,
          ...(url ? { url } : {}),
        });
        setSaved(loaded.saved ?? prompt.saved);
      } catch (error) {
        if (!controller.signal.aborted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Load Full Prompt",
            message: errorMessage(error),
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadPrompt(promptId);
    return () => controller.abort();
  }, [client, prompt]);

  async function toggleSave() {
    if (!prompt.id) return;
    const confirmed = await confirmAlert({
      title: `${saved ? "Remove" : "Save"} ${prompt.title}?`,
      message: "This updates your saved prompts in Tinkerer Club.",
      primaryAction: { title: saved ? "Remove from Saved" : "Save Prompt" },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: saved ? "Removing Prompt" : "Saving Prompt" });
    try {
      await client.call({ path: "prompt.toggleSave", type: "mutation" }, { promptId: prompt.id });
      setSaved((value) => !value);
      toast.style = Toast.Style.Success;
      toast.title = saved ? "Removed from Saved" : "Prompt Saved";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Update Prompt";
      toast.message = errorMessage(error);
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Prompt"
      markdown={promptMarkdown(detail)}
      actions={
        <ActionPanel>
          {detail.content ? (
            <Action.CopyToClipboard title="Copy Prompt" content={detail.content} icon={Icon.Clipboard} />
          ) : (
            <Action.CopyToClipboard title="Copy JSON" content={formatJson(detail.raw)} />
          )}
          {prompt.id ? (
            <Action title={saved ? "Remove from Saved" : "Save Prompt"} icon={Icon.Bookmark} onAction={toggleSave} />
          ) : null}
          {detail.url ? <Action.OpenInBrowser title="Open Prompt in Browser" url={detail.url} /> : null}
          <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}
