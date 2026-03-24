import {
  Action,
  Color,
  Detail,
  Icon,
  List,
  closeMainWindow,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useStickies } from "./hooks/useStickies";
import { StickiesNote } from "./utils/stickies-utils";
import { useStickiesMenu, switchToSticky } from "./useStickiesMenu";
import { useMemo, useState } from "react";

import { useFrontmostApp } from "./hooks/useFrontmostApp";
import Fuse from "fuse.js";
import { ActionsNotes } from "./components/actions-notes";
import { StickiesListEmptyView } from "./components/stickies-list-empty-view";
import { StickiesEmptyView } from "./components/stickies-empty-view";
import { formatNoteDate } from "./utils/date-format";

export default function SearchStickies() {
  const { showAsMarkdown, showDetailMetadata } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data: stickiesNotesData, isLoading, mutate, error: stickiesError } = useStickies();
  const { stickies: openWindowNames } = useStickiesMenu();
  const frontmostApps = useFrontmostApp();

  const stickiesNotes = useMemo(() => {
    if (!stickiesNotesData) return [];
    return stickiesNotesData;
  }, [stickiesNotesData]);

  const fuseStickiesNotes = useMemo(() => {
    if (searchText === "") return stickiesNotes;
    const fuse_ = new Fuse(stickiesNotes, {
      keys: [
        { name: "content", weight: 3 },
        { name: "title", weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
    return fuse_.search(searchText).map((result) => result.item);
  }, [stickiesNotes, searchText]);

  const getWindowNameForNote = (note: StickiesNote) => {
    const cleanContent = note.content.trim().replace(/\n/g, " ");
    for (const windowName of openWindowNames) {
      const simplifiedWindow = windowName.replace(/…$/, "").trim();
      if (simplifiedWindow && cleanContent.startsWith(simplifiedWindow)) {
        return windowName;
      }
    }
    if (openWindowNames.length > 0) {
      const fuse = new Fuse(openWindowNames, { includeScore: true, threshold: 0.6 });
      const results = fuse.search(note.title);
      if (results.length > 0) return results[0].item;
    }
    return null;
  };

  const SwitchAction = ({ note }: { note: StickiesNote }) => {
    const windowName = getWindowNameForNote(note);
    if (!windowName) return null;
    return (
      <Action
        title="Switch to Stickies Note"
        icon={Icon.Eye}
        onAction={async () => {
          try {
            await switchToSticky(windowName);
            await closeMainWindow();
          } catch (e) {
            console.error("Failed to switch:", e);
            showToast({ title: "Failed to switch", message: String(e), style: Toast.Style.Failure });
          }
        }}
      />
    );
  };

  if (stickiesError) {
    return (
      <List searchBarPlaceholder="Search stickies content" onSearchTextChange={setSearchText}>
        <StickiesListEmptyView mutate={mutate} error={stickiesError} />
      </List>
    );
  }

  if (stickiesNotes.length === 0) {
    return <StickiesEmptyView mutate={mutate} isLoading={isLoading} />;
  }

  if (stickiesNotes.length === 1) {
    const note = stickiesNotes[0];
    return (
      <Detail
        isLoading={isLoading}
        actions={
          <ActionsNotes stickiesNote={note} frontmostApps={frontmostApps} mutate={mutate}>
            <SwitchAction note={note} />
          </ActionsNotes>
        }
        markdown={showAsMarkdown ? note.content : "```\n" + note.content + "\n```"}
        metadata={
          showDetailMetadata ? (
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={"Modified"} text={formatNoteDate(note.rawStat.mtime)} />
              <List.Item.Detail.Metadata.Label title={"Created"} text={formatNoteDate(note.rawStat.birthtime)} />
            </List.Item.Detail.Metadata>
          ) : undefined
        }
      />
    );
  }

  const showNoSearchResults = fuseStickiesNotes.length === 0 && searchText.trim() !== "" && stickiesNotes.length > 0;

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder={"Search stickies content"}
      onSearchTextChange={setSearchText}
    >
      {showNoSearchResults ? (
        <List.EmptyView
          title="No Matching Notes"
          description="Try a different search term."
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {fuseStickiesNotes.map((note) => (
        <List.Item
          key={note.path}
          title={note.title}
          icon={{ source: Icon.QuoteBlock, tintColor: Color.SecondaryText }}
          quickLook={{ path: note.rawPath }}
          detail={
            <List.Item.Detail
              isLoading={isLoading}
              markdown={showAsMarkdown ? note.content : "```\n" + note.content + "\n```"}
              metadata={
                showDetailMetadata ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Modified"} text={formatNoteDate(note.rawStat.mtime)} />
                    <List.Item.Detail.Metadata.Label title={"Created"} text={formatNoteDate(note.rawStat.birthtime)} />
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
          actions={
            <ActionsNotes stickiesNote={note} frontmostApps={frontmostApps} mutate={mutate}>
              <SwitchAction note={note} />
            </ActionsNotes>
          }
        />
      ))}
    </List>
  );
}
