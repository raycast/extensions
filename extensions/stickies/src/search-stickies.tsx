import { Color, Detail, Icon, List } from "@raycast/api";
import { useStickies } from "./hooks/useStickies";
import { useMemo, useState } from "react";
import { showAsMarkdown, showDetailMetadata } from "./types/preference";
import { useFrontmostApp } from "./hooks/useFrontmostApp";
import Fuse from "fuse.js";
import { ActionsNotes } from "./components/actions-notes";
import { StickiesListEmptyView } from "./components/stickies-list-empty-view";
import { StickiesEmptyView } from "./components/stickies-empty-view";

export default function MenubarStickies() {
  const [searchText, setSearchText] = useState("");
  const { data: stickiesNotesData, isLoading, mutate } = useStickies();

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

  return stickiesNotes.length > 1 ? (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder={"Search stickies"}
      onSearchTextChange={setSearchText}
    >
      <StickiesListEmptyView mutate={mutate} />
      {fuseStickiesNotes.map((note) => (
        <List.Item
          key={note.path}
          title={note.title}
          icon={{ source: Icon.QuoteBlock, tintColor: Color.SecondaryText }}
          quickLook={{ path: note.rawPath }}
          detail={
            <List.Item.Detail
              isLoading={isLoading}
              markdown={showAsMarkdown ? note.content : "```" + "\n" + note.content + "\n```"}
              metadata={
                showDetailMetadata ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Modified"} text={note.rawStat.mtime.toLocaleString()} />
                    <List.Item.Detail.Metadata.Label title={"Created"} text={note.rawStat.birthtime.toLocaleString()} />
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
          actions={<ActionsNotes stickiesNote={note} frontmostApps={frontmostApps} mutate={mutate} />}
        />
      ))}
    </List>
  ) : stickiesNotes.length === 1 ? (
    <Detail
      isLoading={isLoading}
      actions={<ActionsNotes stickiesNote={fuseStickiesNotes[0]} frontmostApps={frontmostApps} mutate={mutate} />}
      markdown={showAsMarkdown ? fuseStickiesNotes[0].content : "```" + "\n" + fuseStickiesNotes[0].content + "\n```"}
      metadata={
        showDetailMetadata ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title={"Modified"}
              text={fuseStickiesNotes[0].rawStat.mtime.toLocaleString()}
            />
            <List.Item.Detail.Metadata.Label
              title={"Created"}
              text={fuseStickiesNotes[0].rawStat.birthtime.toLocaleString()}
            />
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  ) : (
    <StickiesEmptyView mutate={mutate} />
  );
}
