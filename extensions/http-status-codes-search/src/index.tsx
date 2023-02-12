import { List, ActionPanel, Action, Color } from "@raycast/api";
import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";

enum CodeClass {
  ONEXX = "1xx - Information responses",
  TWOXX = "2xx - Successful responses",
  THREEXX = "3xx - Redirection messages",
  FORUXX = "4xx - Client error responses",
  FIVEXX = "5xx - Server error responses",
}

type Code = {
  name: string;
  content: string;
  url: string;
};

interface CodeClassEntry {
  codeClass: string;
  codes: Code[];
}

const MD_FOLDER = "assets/codes";

const DEFAULT_URL = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status";

export default function Command() {
  const httpCodes: CodeClassEntry[] = buildUpHttpCodes();

  return (
    <List isLoading={false} searchBarPlaceholder="Type here for code..." isShowingDetail={true}>
      {Object.entries(httpCodes).map(([codeClass, codes]) => (
        <List.Section title={`${codes.codeClass}`} key={codeClass}>
          {codes.codes.map((code) => (
            <List.Item
              key={code.name}
              title={{ value: code.name }}
              keywords={[code.content]}
              detail={<List.Item.Detail markdown={`${code.content}`} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={code.url} />
                  <Action.CopyToClipboard content={code.content} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function readeMarkdownFile(filePath: string): string {
  return readFileSync(filePath.toString(), { encoding: "utf8" });
}

function buildUpHttpCodes(): CodeClassEntry[] {
  const foldersAndFiles: CodeClassEntry[] = [];
  let codes: Code[] = [];
  for (const value of Object.values(CodeClass)) {
    //console.debug(`Folder: ${value}`);
    const files = readdirSync(path.join(path.resolve(__dirname), MD_FOLDER, value));
    codes = [];
    files.forEach((file: string) => {
      //console.debug(`Entries for folder ${value}: ${file}`);
      const filePath = path.join(path.resolve(__dirname), MD_FOLDER, value, file.toString());
      const content = readeMarkdownFile(filePath);
      const url = getUrl(content);
      codes.push({ name: file.replace("httpcode ", "").replace(".md", ""), content: content, url: url });
    });
    foldersAndFiles.push({ codeClass: value, codes: codes });
  }

  return foldersAndFiles;
}

function getUrl(content: string): string {
  const result = content.match(/\]\(.*[a-zA-Z0-9:/ ]\)/g);
  return result ? (result.pop() + "").replace("](", "").replace(")", "") : DEFAULT_URL;
}
