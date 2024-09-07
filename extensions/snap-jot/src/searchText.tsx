import { List, ActionPanel, Action, getPreferenceValues, Detail, Icon, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { useState, useEffect, useCallback, useRef } from "react";

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

const BATCH_SIZE = 50;
const LOAD_DELAY = 100;
const MAX_FILES = 10;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const folderPath = preferences.directory;
  const [files, setFiles] = useState<FileContent[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasRunEffect = useRef(false);

  const processBatch = useCallback(
    async (fileNames: string[], startIndex: number) => {
      const batch = fileNames.slice(startIndex, startIndex + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (fileName) => {
          const filePath = path.join(folderPath, fileName);
          const stats = fs.lstatSync(filePath);

          if (stats.isDirectory() || stats.isSymbolicLink()) {
            return null;
          }

          const content = await fs.promises.readFile(filePath, "utf-8");
          return { name: fileName, path: filePath, content };
        }),
      );

      const validResults = batchResults.filter((file): file is FileContent => file !== null);
      setFiles((prevFiles) => [...prevFiles, ...validResults]);

      // Return the array of valid results
      return validResults.reverse();
    },
    [folderPath],
  );

  useEffect(() => {
    if (hasRunEffect.current) return;
    console.log(`Reading files from ${folderPath}`);
    const readFiles = async () => {
      try {
        setIsLoading(true);
        const fileNames = fs.readdirSync(folderPath).reverse();

        let allFiles: FileContent[] = [];

        for (let i = 0; i < Math.min(fileNames.length, MAX_FILES); i += BATCH_SIZE) {
          const batchResults = await processBatch(fileNames, i);
          allFiles = [...allFiles, ...batchResults]; // Collect the array of batch results
          await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY));
          console.log(`Processed ${i + BATCH_SIZE} files`);
        }

        setFiles(allFiles); // Set state once after processing all batches

        setIsLoading(false);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read directory",
          message: (error as Error).message,
        });
        setIsLoading(false);
      }
    };

    readFiles();
    hasRunEffect.current = true;
  }, [folderPath, processBatch]);

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
    <List isLoading={isLoading} searchBarPlaceholder="Search Memos" onSearchTextChange={setSearchText} throttle={true}>
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
