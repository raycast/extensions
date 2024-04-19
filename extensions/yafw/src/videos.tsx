import { useEffect, useState } from "react";
import { Action, ActionPanel, Grid, Icon, showInFinder } from "@raycast/api";
import { fileName, unique } from "./utils";
import { getHistoryFromStorage, saveHistoryToStorage } from "./storage";

export function Videos(props: { files: string[] }) {
  const [history, setHistory] = useState<string[] | null>(null);
  const [allFiles, setAllFiles] = useState<string[]>(props.files);

  useEffect(() => {
    getHistoryFromStorage().then((fromStorage) => {
      if (fromStorage) setHistory(fromStorage);
      else setHistory([]);
    });
  }, []);

  useEffect(() => {
    if (history) {
      const newFiles = [...props.files, ...history];
      setAllFiles(newFiles);
      saveHistoryToStorage(newFiles);
    }
  }, [history, props.files]);

  const removeFromHistory = (file: string) => {
    saveHistoryToStorage(allFiles.filter((f) => f !== file));
    setAllFiles(allFiles.filter((f) => f !== file));
  };

  const clearAllHistory = () => {
    saveHistoryToStorage(props.files);
    setAllFiles(props.files);
  };

  return (
    <Grid selectedItemId={"0"}>
      {unique(allFiles).map((file, index) => (
        <Grid.Item
          id={index.toString()}
          key={file}
          title={fileName(file)}
          content={{ fileIcon: file }}
          quickLook={{ path: file }}
          accessory={
            index < props.files.length ? { icon: { source: Icon.Checkmark, tintColor: "#008080" } } : undefined
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={{ file }} />
              <Action.ToggleQuickLook />
              <Action.Open title="Open" target={file} />
              <Action.OpenWith path={file} />
              <Action title="Open in Finder" onAction={() => showInFinder(file)} icon={{ source: Icon.Finder }} />
              <Action
                title="Remove From History"
                onAction={() => removeFromHistory(file)}
                icon={{ source: Icon.Trash }}
              />
              <Action title="Clear All History" onAction={clearAllHistory} icon={{ source: Icon.Trash }} />
            </ActionPanel>
          }
        />
      ))}
      {history == null && <Grid.Item key="loading" title="Loading history..." content="" />}
    </Grid>
  );
}
