import { environment } from "@raycast/api";
import { Action, ActionPanel, List, LocalStorage, Toast, showHUD, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";
import { Collection, Document } from "../type";
import { getValidFiles } from "../utils";
import { cache, openFileCallback } from "../utils";
import { searchCollection, drawImage } from "swift:../../swift";

export default function SearchCollection(props: { collectionName: string }) {
  if (!props.collectionName) {
    showHUD("No collection provided to search!");
    return;
  }

  const [query, setQuery] = useState("");

  const { data: collection, isLoading } = usePromise(async () => {
    const index = (await LocalStorage.getItem(props.collectionName)) as string | undefined;
    if (!index) {
      showFailureToast(`Couldn't find collection ${props.collectionName}!`);
      return;
    }

    const collection = JSON.parse(index) as Collection;
    const validFiles = getValidFiles(collection.files);
    if (validFiles.length === 0) {
      showFailureToast("No supported files found!");
      return;
    }
    collection.files = validFiles;

    showToast({
      style: Toast.Style.Success,
      title: "Loaded",
      message: `Loaded collection ${props.collectionName}`,
    });
    return collection;
  });

  const {
    data: results,
    isLoading: isQuerying,
    revalidate,
  } = usePromise(async () => {
    if (!query || !collection) return [];
    const documents: Document[] = await searchCollection(query, collection?.name, environment.supportPath);
    return documents;
  });

  // search and update results for the search query everytime the query changes
  useEffect(() => {
    revalidate();
  }, [query]);

  return (
    <List
      isLoading={isLoading || isQuerying}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Searching ${props.collectionName}...`}
      throttle
      isShowingDetail
    >
      {collection && results ? (
        <List.Section title="Results" subtitle={results.length + ""}>
          {results.map((result) => (
            <List.Item
              key={result.id}
              title={result.file.match(/[^\\/]+$/)?.[0] ?? "Unknown File"}
              subtitle={`Page ${result.page + 1}`}
              quickLook={{
                path: result.file,
                name: result.file.match(/[^\\/]+$/)?.[0] ?? "Unknown File", // regex to extract filename from path
              }}
              actions={
                <ActionPanel>
                  <Action.Open
                    target={result.file}
                    onOpen={() => {
                      if (path.extname(result.file) === ".pdf") {
                        openFileCallback(result.page);
                      }
                    }}
                    title="Open File"
                  />
                  <Action.ToggleQuickLook />
                  <Action.OpenWith
                    path={result.file}
                    onOpen={() => openFileCallback(result.page)}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action.ShowInFinder path={result.file} shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} />
                </ActionPanel>
              }
              detail={<SearchResultDetail document={result} />}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function SearchResultDetail({ document }: { document: Document }) {
  const { data: markdown, isLoading } = usePromise(async () => {
    try {
      if (path.extname(document.file) === ".pdf") {
        const key = `${document.file}_${document.page}`;
        const tmpPath = cache.get(key);
        // if file still exists in temp directory render it straightaway
        if (tmpPath && fs.existsSync(tmpPath)) {
          return `![Page Preview](${tmpPath})`;
        } else {
          const newPath = await drawImage(document.file, document.page, document.lower, document.upper);
          cache.set(key, newPath);
          return `![Page Preview](${newPath})`;
        }
      } else {
        const buffer = fs.readFileSync(document.file);
        return buffer.toString();
      }
    } catch (err) {
      showFailureToast(`Error occurred when drawing page: ${err}`);
    }
  });

  return <List.Item.Detail isLoading={isLoading} markdown={markdown} />;
}
