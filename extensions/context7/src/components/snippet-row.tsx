import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import type { ReactNode } from "react";

import { showErrorToast } from "../lib/error-utils";
import { buildSavedAccessory } from "../lib/library-format";
import { addSnippet, removeSnippet, snippetKey } from "../lib/my-snippets";
import { renderSnippetMarkdown, snippetSourceUrl } from "../lib/snippet-format";
import type { ContextSnippet } from "../lib/types";
import { SnippetClipboardActions } from "./snippet-actions";

/**
 * The one snippet row, used by every list that shows snippets. Three hand-written copies had
 * already drifted apart — only two of them offered Toggle Details — which is exactly the class
 * of inconsistency a shared component makes impossible.
 */
export function SnippetRow(props: {
  snippet: ContextSnippet;
  library: { id: string; name: string };
  isSaved: boolean;
  onSavedChange: () => Promise<void>;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  /** Shown before the saved star, and only when the detail pane is closed and there is room. */
  listOnlyAccessories?: List.Item.Accessory[];
  /** Provenance matters only where results span libraries. */
  showLibraryTag?: boolean;
  fallbackTitle?: string;
  extraActions?: ReactNode;
}) {
  const {
    snippet,
    library,
    isSaved,
    onSavedChange,
    isShowingDetail,
    onToggleDetail,
    listOnlyAccessories,
    showLibraryTag = false,
    fallbackTitle,
    extraActions,
  } = props;

  const markdown = renderSnippetMarkdown(snippet);
  const sourceUrl = snippetSourceUrl(snippet.source);

  // With the detail pane open the title column is narrow enough that tags truncate it, so the
  // extras are dropped and the pane carries that information instead.
  const accessories: List.Item.Accessory[] = isShowingDetail
    ? [buildSavedAccessory(isSaved)]
    : [
        ...(showLibraryTag ? [{ tag: { value: library.name, color: Color.SecondaryText }, tooltip: library.id }] : []),
        ...(listOnlyAccessories ?? []),
        buildSavedAccessory(isSaved),
      ];

  return (
    <List.Item
      title={snippet.title || fallbackTitle || "Snippet"}
      subtitle={snippet.subtitle}
      icon={snippet.kind === "code" ? Icon.CodeBlock : Icon.Document}
      accessories={accessories}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <SnippetClipboardActions snippet={snippet} markdown={markdown} />
          <ActionPanel.Section>
            <Action
              title="Toggle Details"
              icon={Icon.Sidebar}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
              }}
              onAction={onToggleDetail}
            />
            <Action
              title={isSaved ? "Remove from My Snippets" : "Add to My Snippets"}
              icon={isSaved ? Icon.StarDisabled : Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={async () => {
                try {
                  // Intent, not toggle. A toggle re-reads current state, so on a stale row —
                  // one whose snippet another command already removed — "Remove" would flip
                  // "not saved" back to saved and re-add it while the toast claimed removal.
                  if (isSaved) {
                    await removeSnippet(snippetKey(snippet, library.id));
                  } else {
                    await addSnippet(snippet, library);
                  }

                  await onSavedChange();
                  await showToast({
                    style: Toast.Style.Success,
                    title: isSaved ? "Removed from My Snippets" : "Added to My Snippets",
                  });
                } catch (error) {
                  await showErrorToast("Could Not Update My Snippets", error);
                }
              }}
            />
            {sourceUrl ? (
              <Action.OpenInBrowser title="Open in Browser" url={sourceUrl} shortcut={Keyboard.Shortcut.Common.Open} />
            ) : null}
          </ActionPanel.Section>
          {extraActions}
        </ActionPanel>
      }
    />
  );
}
