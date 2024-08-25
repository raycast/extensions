import { List, ActionPanel, Action, getPreferenceValues, Detail, Icon, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { useState, useEffect } from "react";

interface Preferences {
  directory: string;
}

interface FileContent {
  name: string;
  path: string;
  content: string;
}

interface MatchedLine {
  fileName: string;
  filePath: string;
  line: string;
  lineNumber: number;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const folderPath = preferences.directory;
  const [files, setFiles] = useState<FileContent[]>([]);
  const [searchText, setSearchText] = useState("");
  useEffect(() => {
    const readFiles = () => {
      try {
        const fileNames = fs.readdirSync(folderPath);
        const fileContents = fileNames
          .map((fileName) => {
            const filePath = path.join(folderPath, fileName);

            // Check if the file is a directory
            if (fs.lstatSync(filePath).isDirectory()) {
              return null;
            }
            // シンボリックリンクの場合は無視
            if (fs.lstatSync(filePath).isSymbolicLink()) {
              return null;
            }

            const content = fs.readFileSync(filePath, "utf-8");
            return { name: fileName, path: filePath, content };
          })
          .filter((file): file is { name: string; path: string; content: string } => file !== null); // Type guard to exclude null

        setFiles(fileContents);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read directory",
          message: (error as Error).message,
        });
      }
    };
    readFiles();
  }, [folderPath]);

  const matchedLines: MatchedLine[] = files
    .flatMap((file) => {
      return file.content.split("\n").reduce((acc: MatchedLine[], line, index) => {
        if (line.startsWith("- ") && line.toLowerCase().includes(searchText.toLowerCase())) {
          acc.push({
            fileName: file.name,
            filePath: file.path,
            line: line,
            lineNumber: index + 1,
          });
        }
        return acc;
      }, []);
    })
    .reverse();

  return (
    <List searchBarPlaceholder="Search Memos" onSearchTextChange={setSearchText} throttle={true}>
      {matchedLines.map((matchedLine) => (
        <List.Item
          key={`${matchedLine.filePath}-${matchedLine.lineNumber}`}
          title={matchedLine.fileName}
          subtitle={getHighlightedContent(matchedLine.line, searchText)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Circle}
                target={
                  <Detail
                    markdown={getFullHighlightedContent(matchedLine, searchText)}
                    metadata={
                      <Detail.Metadata>
                        <Detail.Metadata.Label title="File" text={matchedLine.fileName} />
                        <Detail.Metadata.Separator />
                        <Detail.Metadata.Label title="Path" text={matchedLine.filePath} />
                      </Detail.Metadata>
                    }
                    actions={
                      <ActionPanel>
                        <Action.Open title="Open File" target={matchedLine.filePath} />
                      </ActionPanel>
                    }
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getHighlightedContent(content: string, searchText: string): string {
  if (!searchText) return content;
  const regex = new RegExp(`(${searchText})`, "gi");
  return content.replace(regex, "$1");
}

function getFullHighlightedContent(matchedLine: MatchedLine, searchText: string): string {
  const fileContent = fs.readFileSync(matchedLine.filePath, "utf-8");
  const lines = fileContent.split("\n");
  const relevantLines = lines.slice(matchedLine.lineNumber - 1);

  const highlightedLines = relevantLines.map((line, index) => {
    if (index === 0) {
      return getHighlightedContent(line, searchText);
    }
    return line;
  });

  return highlightedLines.join("\n");
}
