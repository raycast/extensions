import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ParsedFilePath } from "./helpers";

export function DisplayFile({
  file,
  resetRanking,
  visitItem,
}: {
  file: ParsedFilePath;
  resetRanking: (item: ParsedFilePath) => Promise<void>;
  visitItem: (item: ParsedFilePath) => Promise<void>;
}) {
  return (
    <List.Item
      key={file.id}
      icon="FM12Doc.png"
      title={file.fileName}
      subtitle={file.locationName}
      keywords={fileToKeywords(file)}
      accessories={[file.local && !file.exists ? { icon: Icon.Warning } : {}]}
      actions={
        <ActionPanel>
          {file.local ? (
            file.exists ? (
              <>
                <Action.Open
                  target={file.path}
                  title="Launch File"
                  icon={Icon.ArrowNe}
                  onOpen={() => visitItem(file)}
                />
                <Action.ShowInFinder path={file.path} />
              </>
            ) : (
              <></>
            )
          ) : (
            <Action.OpenInBrowser
              url={`fmp://${file.host}/${encodeURIComponent(file.fileName)}`}
              title="Launch File"
              icon={Icon.ArrowNe}
              onOpen={() => visitItem(file)}
            />
          )}
          <Action title="Reset Ranking" icon={Icon.Undo} onAction={() => resetRanking(file)} />
        </ActionPanel>
      }
    />
  );
}

function fileToKeywords(file: ParsedFilePath): string[] {
  const keywords = [file.fileName, ...specialParseString(file.fileName)];
  if (file.local) {
    keywords.push(file.path);
    keywords.push(...specialParseString(file.path));
  } else {
    keywords.push(file.host);
    keywords.push(...specialParseString(file.host));

    keywords.push(file.locationName);
    keywords.push(...specialParseString(file.locationName));
  }

  return keywords;
}

function specialParseString(input: string): string[] {
  const keywords = [];
  // remove all special charactesr from filename, then add to keywords
  const fileName = input.replace(/[^a-zA-Z0-9 ]/g, "");
  keywords.push(fileName);

  // detect camel case from filename and add each word to keywords
  const camelCaseWords = fileName.split(/(?=[A-Z])/);
  keywords.push(...camelCaseWords);

  return keywords;
}
