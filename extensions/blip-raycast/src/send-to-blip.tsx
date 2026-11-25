import { ActionPanel, environment, getFrontmostApplication, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { ContentItem } from "./components/ContentItem";
import { ChooseFilesAction, TypeTextAction } from "./components/SendActions";
import { readClipboardContent } from "./lib/clipboard";
import type { SendContent } from "./lib/content";
import { fileManagerName, readSelectionContent } from "./lib/selection";

/** Reads everything up front, so the list appears once, in its final order. */
async function loadSources() {
  const [selection, clipboard, frontmost] = await Promise.all([
    readSelectionContent().catch(() => undefined),
    readClipboardContent(environment.supportPath).catch((error: unknown) => {
      showFailureToast(error, { title: "Couldn't Read the Clipboard" });
      return undefined;
    }),
    getFrontmostApplication().catch(() => undefined),
  ]);
  // Finder's selection survives after you switch away, so only lead with it if you came from there.
  const cameFromFileManager =
    frontmost?.bundleId === "com.apple.finder" || /explorer\.exe$/i.test(frontmost?.path ?? "");
  return { selection, clipboard, cameFromFileManager };
}

export default function Command() {
  const [typed, setTyped] = useState("");
  const { data, isLoading } = usePromise(loadSources);

  const typedContent: SendContent | undefined = typed.trim()
    ? { kind: "text", text: typed, source: "Typed" }
    : undefined;
  const selection = data?.selection && (
    <List.Section key="selection" title={`Selected in ${fileManagerName}`}>
      <ContentItem content={data.selection} />
    </List.Section>
  );
  const clipboard = data?.clipboard && (
    <List.Section key="clipboard" title="Clipboard">
      <ContentItem content={data.clipboard} />
    </List.Section>
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setTyped}
      searchBarPlaceholder="Type text to send, or choose below"
    >
      {typedContent && (
        <List.Section title="Typed Text">
          <ContentItem content={typedContent} />
        </List.Section>
      )}
      {data && (data.cameFromFileManager ? [selection, clipboard] : [clipboard, selection])}
      {data && (
        <List.Section title={data.selection || data.clipboard || typedContent ? "Other" : undefined}>
          <List.Item
            icon={Icon.Text}
            title="Type Text…"
            subtitle="Arrives as a .txt file"
            actions={
              <ActionPanel>
                <TypeTextAction initialText={typed} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Folder}
            title="Choose Files…"
            subtitle="Any files or folders"
            actions={
              <ActionPanel>
                <ChooseFilesAction />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
