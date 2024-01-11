import { environment } from "@raycast/api";
import { Action, ActionPanel, LaunchProps, List, LocalStorage, Toast, showHUD, showToast } from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { chmod } from "fs/promises";
import { ExecaChildProcess, execa } from "execa";
import path from "path";
import { Collection, Document } from "./type";

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  if (!props.arguments) {
    showHUD("No collection provided to search!");
    return;
  }
  const [isQuerying, setIsQuerying] = useState(false);
  const [results, setResults] = useState<(Document & { id: number })[]>([]);
  const [query, setQuery] = useState("");
  const searchProcess = useRef<ExecaChildProcess<string> | null>(null);

  const { data: collectionName, isLoading } = usePromise(async () => {
    const index = (await LocalStorage.getItem(props.arguments.collection)) as string | undefined;
    if (!index) {
      showFailureToast(`Couldn't find collection ${props.arguments.collection}!`);
      throw new Error(`Failed to get collection ${props.arguments.collection}!`);
    }
    const collection = JSON.parse(index) as Collection;
    showToast({
      style: Toast.Style.Success,
      title: "Loaded",
      message: `Loaded collection ${props.arguments.collection}`,
    });
    return collection.name || "";
  });

  const searchFiles = useCallback(
    async (query: string) => {
      if (!collectionName) return [];
      const documents: (Document & { id: number })[] = [];
      setIsQuerying(true);
      // execute swift bianry that will load saved database
      const command = path.join(environment.assetsPath, "SearchIndex");
      const databasePath = path.join(environment.supportPath, `${collectionName}.sqlite`);
      await chmod(command, "755");
      const process = execa(command, [databasePath, query]);
      searchProcess.current = process;

      try {
        const { stdout, exitCode } = await process;
        setIsQuerying(false);
        if (exitCode == 0) {
          for (const { content, page, file, id, score } of JSON.parse(stdout)) {
            documents.push({ content, page, file, id, score });
          }
        } else {
          showFailureToast("Error when parsing " + collectionName);
        }
      } catch (err) {
        // catch process cancellation that is triggered when query changes
      }

      return documents.sort((a, b) => b.score - a.score);
    },
    [collectionName],
  );

  const openFile = async (filepath: string, page: number) => {
    try {
      if (!filepath.toLowerCase().endsWith(".pdf")) {
        throw new Error("The file is not a PDF.");
      }

      const appleScriptFilePath = filepath.replace(/"/g, '\\"');
      const script = `
      set posixFile to POSIX file "${appleScriptFilePath}"
      tell application "Finder" to open posixFile

      delay 1
      tell application "System Events"
          keystroke "g" using {option down, command down}
          keystroke "${page}"
          keystroke return
      end tell
      `;

      await runAppleScript(script);
      await showHUD(`Opened ${filepath} at page ${page}`);
    } catch (error) {
      await showHUD(error instanceof Error ? error.message : `Could not open: ${filepath}`);
    }
  };

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
    } else if (collectionName) {
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
      searchBarPlaceholder={`Searching ${props.arguments.collection}...`}
      throttle
      isShowingDetail
    >
      {collectionName ? (
        <List.Section title="Results" subtitle={results.length + ""}>
          {results.map((result) => (
            <List.Item
              key={result.id}
              title={result.file.match(/[^\\/]+$/)?.[0] ?? "Unknown File"}
              subtitle={`Page ${result.page}`}
              actions={
                <ActionPanel>
                  <Action onAction={() => openFile(result.file, result.page)} title="Open File" />
                </ActionPanel>
              }
              detail={<List.Item.Detail markdown={result.content} />}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
