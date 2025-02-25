import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  PreferenceValues,
  open,
  Clipboard,
  popToRoot,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { convertSvgToPng } from "./utils/svg-converter";
import { showFailureToast } from "@raycast/utils";

interface SVGFile {
  path: string;
  name: string;
  modifiedTime: Date;
}

interface DirectoryItem {
  path: string;
  name: string;
  isDirectory: boolean;
  modifiedTime: Date;
}

function ConversionView({ svgFile }: { svgFile: SVGFile }) {
  const preferences = getPreferenceValues<PreferenceValues>();
  const [scale, setScale] = useState(preferences?.defaultScale || "1");

  async function handleConversion() {
    try {
      const outputPath = path.join(
        preferences.defaultOutputPath,
        `${path.basename(svgFile.name, ".svg")}-${scale}x.png`,
      );

      await showToast({ style: Toast.Style.Animated, title: "Converting Svg..." });

      await convertSvgToPng(svgFile.path, outputPath, parseFloat(scale));

      await showToast({
        style: Toast.Style.Success,
        title: "Conversion Complete and Copied to Clipboard",
        message: "PNG file has been created",
      });

      try {
        const fileContent: Clipboard.Content = { file: outputPath };
        await Clipboard.copy(fileContent);
        if (preferences.defaultOpenAfterConversion) {
          await open(outputPath);
        }
        popToRoot();
      } catch (error) {
        showFailureToast(error);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion Failed",
        message: String(error),
      });
    }
  }

  return (
    <List>
      <List.Item
        title={`Convert ${svgFile.name}`}
        subtitle="Choose Scale Factor and Convert"
        accessories={[{ text: `Scale: ${scale}x` }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Convert" onAction={handleConversion} icon={Icon.Download} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {[
                { scale: 1, key: "1" },
                { scale: 2, key: "2" },
                { scale: 4, key: "4" },
                { scale: 8, key: "8" },
                { scale: 16, key: "i" },
                { scale: 32, key: "t" },
                { scale: 64, key: "x" },
              ].map(({ scale: scaleOption, key }) => (
                <Action
                  key={scaleOption}
                  title={`Set Scale ${scaleOption}X`}
                  onAction={() => setScale(scaleOption.toString())}
                  shortcut={{ modifiers: ["cmd"], key: key as Keyboard.KeyEquivalent }}
                />
              ))}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  const [currentItems, setCurrentItems] = useState<DirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(getPreferenceValues().defaultOutputPath);
  const [searchText, setSearchText] = useState("");

  async function loadDirectoryContents(dirPath: string) {
    setIsLoading(true);
    try {
      const readdir = promisify(fs.readdir);
      const stat = promisify(fs.stat);
      const files = await readdir(dirPath);

      const items: DirectoryItem[] = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stats = await stat(filePath);
          if (stats.isDirectory() || path.extname(file).toLowerCase() === ".svg") {
            items.push({
              path: filePath,
              name: file,
              isDirectory: stats.isDirectory(),
              modifiedTime: stats.mtime,
            });
          }
        } catch (error) {
          continue;
        }
      }

      // Sort: SVG files first, then directories, both alphabetically
      items.sort((a, b) => {
        const isSvgA = path.extname(a.name).toLowerCase() === ".svg";
        const isSvgB = path.extname(b.name).toLowerCase() === ".svg";

        if (isSvgA && !isSvgB) return -1;
        if (!isSvgA && isSvgB) return 1;
        if (isSvgA && isSvgB) return a.name.localeCompare(b.name);
        if (a.isDirectory && b.isDirectory) return a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });

      setCurrentItems(items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Directory",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDirectoryContents(currentPath);
  }, [currentPath]);

  function navigateToDirectory(dirPath: string) {
    setSearchText("");
    setCurrentPath(dirPath);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter items..."
      navigationTitle={currentPath}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action.ShowInFinder
            title="Open Current Folder in Finder"
            path={currentPath}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      {currentPath !== "/" && (
        <List.Item
          icon={Icon.ArrowUp}
          title="Parent Directory"
          subtitle="Go Up One Level"
          actions={
            <ActionPanel>
              <Action
                title="Go to Parent Directory"
                onAction={() => navigateToDirectory(path.dirname(currentPath))}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action.ShowInFinder
                title="Open Parent in Finder"
                path={path.dirname(currentPath)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      )}

      {currentItems.map((item) => (
        <List.Item
          key={item.path}
          icon={item.isDirectory ? Icon.Folder : Icon.Document}
          title={item.name}
          accessories={[
            {
              text: new Date(item.modifiedTime).toLocaleDateString(),
              tooltip: `Modified: ${item.modifiedTime.toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              {item.isDirectory ? (
                <Action title="Open Directory" onAction={() => navigateToDirectory(item.path)} icon={Icon.Folder} />
              ) : (
                <>
                  <Action.Push
                    title="Convert to Png"
                    target={
                      <ConversionView
                        svgFile={{
                          path: item.path,
                          name: item.name,
                          modifiedTime: item.modifiedTime,
                        }}
                      />
                    }
                    icon={Icon.Download}
                  />
                  <Action.ShowInFinder path={item.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={item.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </>
              )}
              <Action.ShowInFinder path={item.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
