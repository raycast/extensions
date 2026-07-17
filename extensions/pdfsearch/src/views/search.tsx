import { Action, ActionPanel, List, LocalStorage, Toast, environment, showHUD, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { useEffect, useRef, useState } from "react";
import { drawImage, searchCollection } from "swift:../../swift";
import { Collection, Document } from "../type";
import { cache, getValidFiles, openFileCallback } from "../utils";

const readStreamPath = "/tmp/search_results.jsonl";
const sigtermFilePath = "/tmp/search_process.terminate";
const lockFilePath = "/tmp/search_process.lock";

export default function SearchCollection(props: { collectionName: string }) {
  if (!props.collectionName) {
    showHUD("No collection provided to search!");
    return;
  }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const readStreamRef = useRef<fs.ReadStream | undefined>();
  const watcherRef = useRef<fs.FSWatcher | undefined>();

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

  const createReader = () => {
    if (readStreamRef.current) {
      readStreamRef.current.close();
    }
    const readStream = fs.createReadStream(readStreamPath, { encoding: "utf8" });
    readStreamRef.current = readStream;
    let buffer = "";

    readStream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep the last incomplete line in the buffer if parsing fails
      const searchResults = [];
      for (const i in lines) {
        try {
          searchResults.push(JSON.parse(lines[i]) as Document);
        } catch {
          continue;
        }
      }
      setResults(searchResults);
    });
  };

  // search and update results for the search query everytime the query changes
  useEffect(() => {
    const handleSearch = async () => {
      if (!query || !collection) {
        setResults([]);
        return;
      }

      try {
        setIsSearching(true);
        fs.writeFileSync(readStreamPath, "", "utf8"); // reset file where results are written to
        // We do not need to call createReader() here since writing to file triggers it.
        await searchCollection(query, collection.name, environment.supportPath);
      } catch (err) {
        showFailureToast(err);
      } finally {
        if (fs.existsSync(lockFilePath)) {
          fs.unlinkSync(lockFilePath); // remove lock file after search is completed
        }
        setIsSearching(false);
      }
    };

    const searchOnLockFileFree = () => {
      // if lock file exists, send signal to terminate ongoing search process
      if (fs.existsSync(lockFilePath)) {
        fs.writeFileSync(sigtermFilePath, "");
        setTimeout(() => {
          searchOnLockFileFree();
        }, 200); // wait for half a second to allow existing process to cleanup
      } else {
        handleSearch();
      }
    };

    searchOnLockFileFree();
  }, [query, collection]);

  useEffect(() => {
    fs.writeFileSync(readStreamPath, "", "utf8"); // reset file where results are written to
    watcherRef.current = fs.watch(readStreamPath, (eventType) => {
      if (eventType === "change") {
        // continue the read stream if we have more writes to file
        createReader();
      }
    });
    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
      if (fs.existsSync(readStreamPath)) {
        fs.unlinkSync(readStreamPath);
      }
    };
  }, []);

  return (
    <List
      isLoading={isLoading || isSearching}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Search ${props.collectionName}...`}
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
