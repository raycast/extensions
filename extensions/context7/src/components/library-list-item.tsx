import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import type { ReactNode } from "react";

import { createSearchContextDeeplink } from "../lib/deeplink";
import { showErrorToast } from "../lib/error-utils";
import { countOf } from "../lib/text";
import { loadLibraryDocs } from "../lib/library-docs";
import {
  buildLibraryAccessories,
  buildSavedAccessory,
  formatLibraryIdentifier,
  getLibraryIcon,
} from "../lib/library-format";
import { toggleLibrary } from "../lib/my-libraries";
import { SearchDocumentationView } from "../search-documentation";
import type { LibrarySummary } from "../lib/types";

export function LibraryListItem(props: {
  library: LibrarySummary;
  isSaved: boolean;
  onSavedChange: () => Promise<void>;
  accessories?: List.Item.Accessory[];
  onVisit?: () => Promise<void>;
  extraActions?: ReactNode;
}) {
  const { library, isSaved, onSavedChange, accessories, onVisit, extraActions } = props;

  return (
    <List.Item
      title={library.name}
      subtitle={formatLibraryIdentifier(library.id)}
      icon={getLibraryIcon(library.id)}
      accessories={[...(accessories ?? buildLibraryAccessories(library)), buildSavedAccessory(isSaved)]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Search Documentation"
              icon={Icon.MagnifyingGlass}
              target={
                <SearchDocumentationView
                  libraryId={library.id}
                  libraryName={library.name}
                  librarySummary={library}
                  onLibraryChange={onSavedChange}
                />
              }
              onPush={onVisit}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isSaved ? "Remove from My Libraries" : "Add to My Libraries"}
              icon={isSaved ? Icon.StarDisabled : Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => handleToggle(library, onSavedChange)}
            />
            <Action.CopyToClipboard
              title="Copy Library ID"
              content={library.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CreateQuicklink
              title="Create Quicklink"
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "k" },
                Windows: { modifiers: ["ctrl", "shift"], key: "k" },
              }}
              quicklink={{
                link: createSearchContextDeeplink(library),
                name: `Search Documentation in ${library.name}`,
              }}
            />
          </ActionPanel.Section>
          {extraActions}
        </ActionPanel>
      }
    />
  );
}

async function handleToggle(library: LibrarySummary, onSavedChange: () => Promise<void>) {
  try {
    const saved = await toggleLibrary(library);
    const nowSaved = saved.some((entry) => entry.id === library.id);
    await onSavedChange();

    if (!nowSaved) {
      await showToast({ style: Toast.Style.Success, title: "Removed from My Libraries", message: library.name });
      return;
    }

    // Cache immediately rather than on first open: cross-library search reads from disk, so a
    // library added but never opened would silently contribute nothing to it.
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding to My Libraries",
      message: library.name,
    });

    try {
      const docs = await loadLibraryDocs(library.id, { isSaved: true, forceRefresh: true });
      toast.style = Toast.Style.Success;
      toast.title = "Added to My Libraries";
      toast.message = `${library.name} — ${countOf(docs.snippets.length, "snippet")}`;
    } catch (error) {
      // The library is saved either way; only its documentation is missing, and opening it
      // or running Refresh will fill the cache later.
      await toast.hide();
      await showErrorToast("Added, but Could Not Download Documentation", error);
    }

    await onSavedChange();
  } catch (error) {
    await showErrorToast("Could Not Update My Libraries", error);
  }
}
