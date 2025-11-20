import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { openInAntigravity } from "./utils";

interface Preferences {
  projectRoot: string;
}

function getProjectRoot() {
  const prefs = getPreferenceValues<Preferences>();
  let root = prefs.projectRoot;
  if (root.startsWith("~")) {
    root = root.replace("~", homedir());
  }
  return root;
}

function FileList({
  path,
  navigationTitle,
}: {
  path: string;
  navigationTitle?: string;
}) {
  const [items, setItems] = useState<{ name: string; isDirectory: boolean }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    try {
      const files = readdirSync(path);
      const fileItems = files
        .filter((file) => !file.startsWith("."))
        .map((file) => {
          try {
            const isDirectory = statSync(join(path, file)).isDirectory();
            return { name: file, isDirectory };
          } catch {
            return null;
          }
        })
        .filter(
          (item): item is { name: string; isDirectory: boolean } =>
            item !== null,
        )
        .sort((a, b) => {
          if (a.isDirectory === b.isDirectory)
            return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        });
      setItems(fileItems);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load files",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search files..."
      navigationTitle={navigationTitle}
    >
      {items.map((item) => {
        const fullPath = join(path, item.name);
        return (
          <List.Item
            key={fullPath}
            title={item.name}
            icon={item.isDirectory ? Icon.Folder : Icon.Document}
            actions={
              <ActionPanel>
                {item.isDirectory ? (
                  <>
                    <Action
                      title="Open in Antigravity"
                      onAction={() => openInAntigravity(fullPath)}
                    />
                    <Action
                      title="Open Folder"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() =>
                        push(
                          <FileList
                            path={fullPath}
                            navigationTitle={item.name}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Open in New Window"
                      icon={Icon.AppWindow}
                      onAction={() =>
                        openInAntigravity(fullPath, { newWindow: true })
                      }
                    />
                    <Action.ShowInFinder path={fullPath} />
                    <Action.CopyToClipboard
                      title="Copy Name"
                      content={item.name}
                    />
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={fullPath}
                    />
                  </>
                ) : (
                  <>
                    <Action
                      title="Open in Antigravity"
                      onAction={() => openInAntigravity(fullPath)}
                    />
                    <Action
                      title="Open in New Window"
                      icon={Icon.AppWindow}
                      onAction={() =>
                        openInAntigravity(fullPath, { newWindow: true })
                      }
                    />
                    <Action.ShowInFinder path={fullPath} />
                    <Action.CopyToClipboard
                      title="Copy Name"
                      content={item.name}
                    />
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={fullPath}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  const root = getProjectRoot();
  return <FileList path={root} />;
}
