import { environment } from "@raycast/api";
import { Action, ActionPanel, List, LocalStorage, Toast, showHUD, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { chmod } from "fs/promises";
import { ExecaChildProcess, execa } from "execa";
import path from "path";
import { Collection, Document } from "../type";
import { getValidFiles } from "../util";
import { openFileCallback } from "../utils";

export default function SearchCollection(props: { collectionName: string }) {
  if (!props.collectionName) {
    showHUD("No collection provided to search!");
    return;
  }
  const [isQuerying, setIsQuerying] = useState(false);
  const [results, setResults] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const searchProcess = useRef<ExecaChildProcess<string> | null>(null);

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

  const searchFiles = useCallback(
    async (query: string) => {
      if (!collection) return [];
      const documents: Document[] = [];
      setIsQuerying(true);
      // execute swift binary that will search files in collection
      const command = path.join(environment.assetsPath, "SearchDocument");
      await chmod(command, "755");
      const process = execa(command, [query, ...collection.files]);
      searchProcess.current = process;

      try {
        const { stdout, exitCode } = await process;
        setIsQuerying(false);
        if (exitCode == 0) {
          for (const { content, page, file, id, score, lower, upper } of JSON.parse(stdout)) {
            documents.push({ content, page, file, id, score, lower, upper });
          }
        } else {
          showFailureToast("Error when parsing " + collection);
        }
      } catch (err) {
        // catch process cancellation exception that is triggered when query changes
      }

      return documents;
    },
    [collection],
  );

  // search and update results for the search query everytime the query changes
  useEffect(() => {
    // terminate existing search process
    if (searchProcess.current) {
      searchProcess.current.cancel();
      searchProcess.current = null;
    }

    if (!query) {
      // if search query becomes empty, terminate all ongoing searches
      setResults([]);
      setIsQuerying(false);
    } else if (collection) {
      const handleSearch = async () => {
        const documents = await searchFiles(query);
        setResults(documents);
      };
      handleSearch();
    }
  }, [query]);

  // Clean up running processes when component unmounts
  useEffect(() => {
    return () => {
      if (searchProcess.current) {
        searchProcess.current.cancel();
        searchProcess.current = null;
      }
    };
  }, []);

  return (
    <List
      isLoading={isLoading || isQuerying}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Searching ${props.collectionName}...`}
      throttle
      isShowingDetail
    >
      {collection ? (
        <List.Section title="Results" subtitle={results.length + ""}>
          {results.map((result) => (
            <List.Item
              key={result.id}
              title={result.file.match(/[^\\/]+$/)?.[0] ?? "Unknown File"}
              subtitle={`Page ${result.page + 1}`}
              quickLook={{ path: result.file, name: result.file.match(/[^\\/]+$/)?.[0] ?? "Unknown File" }}
              actions={
                <ActionPanel>
                  <Action.Open target={result.file} onOpen={() => openFileCallback(result.page)} title="Open File" />
                  <Action.ToggleQuickLook />
                  <Action.OpenWith
                    path={result.file}
                    onOpen={() => openFileCallback(result.page)}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action.ShowInFinder path={result.file} shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} />
                </ActionPanel>
              }
              detail={<Detail document={result} />}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function Detail({ document }: { document: Document }) {
  const drawProcess = useRef<ExecaChildProcess>();
  const [imagePath, setImagePath] = useState<string>("");

  useEffect(() => {
    const createImage = async () => {
      // execute swift binary that will draw image of pdf page and highlght search result
      const command = path.join(environment.assetsPath, "DrawImage");
      await chmod(command, "755");
      const process = execa(command, [
        document.file,
        document.page.toString(),
        document.lower.toString(),
        document.upper.toString(),
      ]);
      drawProcess.current = process;

      try {
        const { stdout, exitCode } = await process;
        if (exitCode === 0) {
          setImagePath(stdout);
        }
      } catch {
        // catch process cancellation exception that is triggered when query changes
      }
    };

    createImage();

    return () => drawProcess.current?.cancel();
  }, []);

  return <List.Item.Detail isLoading={imagePath === ""} markdown={`![Image Preview](${imagePath})`} />;
}
