import { Action, ActionPanel, Clipboard, Icon, List, closeMainWindow, showHUD, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Prompt, bolt, boltJSON, showBoltFailure } from "./bolt";
import { LoadErrorView } from "./load-error";

const promptText = (id: string) => bolt(["prompts", "show", id]);

function PromptDetail(props: { prompt: Prompt }) {
  const { isLoading, data } = useCachedPromise(promptText, [props.prompt.id], { onError: showBoltFailure });
  return <List.Item.Detail isLoading={isLoading} markdown={data ?? ""} />;
}

export default function Command() {
  // Failures show in the list itself (LoadErrorView), not as a toast.
  const { isLoading, data, error, revalidate } = useCachedPromise(() => boltJSON<Prompt[]>(["prompts"]), [], {
    onError: () => {},
  });

  async function withText(prompt: Prompt, use: (text: string) => Promise<void>) {
    try {
      await use(await promptText(prompt.id));
    } catch (error) {
      await showBoltFailure(error);
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail={!error} searchBarPlaceholder="Search prompts">
      {error && !isLoading ? (
        <LoadErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Text}
          title={isLoading ? "Loading prompts…" : "No saved prompts"}
          description={isLoading ? undefined : "Save prompts in BoltAI to use them here."}
        />
      )}
      {(error ? [] : (data ?? [])).map((prompt) => (
        <List.Item
          key={prompt.id}
          icon={Icon.Text}
          title={prompt.name}
          keywords={prompt.description ? [prompt.description] : undefined}
          detail={<PromptDetail prompt={prompt} />}
          actions={
            <ActionPanel>
              <Action
                title="Paste Prompt"
                icon={Icon.Clipboard}
                onAction={() =>
                  withText(prompt, async (text) => {
                    await closeMainWindow();
                    await Clipboard.paste(text);
                  })
                }
              />
              <Action
                title="Copy Prompt"
                icon={Icon.CopyClipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={() =>
                  withText(prompt, async (text) => {
                    await Clipboard.copy(text);
                    await showHUD("Copied prompt");
                  })
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
