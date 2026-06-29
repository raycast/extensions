import { useState } from "react";
import { List, Action, ActionPanel, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

type CharData = { "1": string; "2": string; "3": string; "4": string };
type IxData = Record<string, CharData>;

const data: IxData = JSON.parse(
  readFileSync(join(environment.assetsPath, "ixdata.json"), "utf-8"),
);

function getUnicodeBlock(cp: number): string {
  if (cp >= 0x4e00 && cp <= 0x9fff) return "基本区";
  if (cp >= 0x3400 && cp <= 0x4dbf) return "扩展A";
  if (cp >= 0x20000 && cp <= 0x2a6df) return "扩展B";
  if (cp >= 0x2a700 && cp <= 0x2b73f) return "扩展C";
  if (cp >= 0x2b740 && cp <= 0x2b81f) return "扩展D";
  if (cp >= 0x2b820 && cp <= 0x2ceaf) return "扩展E";
  if (cp >= 0x2ceb0 && cp <= 0x2ebef) return "扩展F";
  if (cp >= 0x30000 && cp <= 0x3134f) return "扩展G";
  if (cp >= 0x31350 && cp <= 0x323af) return "扩展H";
  if (cp >= 0x2ebf0 && cp <= 0x2f7ff) return "扩展I";
  return "";
}

function buildMarkdown(char: string, d: CharData): string {
  const cp = char.codePointAt(0)!;
  const hex = cp.toString(16).toUpperCase();
  const block = getUnicodeBlock(cp);
  const unicode = `U+${hex}${block ? ` (${block})` : ""}`;

  return `## 汉字：${char}

**编码：** ${d["1"]}

**鹤形：** ${d["2"]}

**拆分：** ${d["3"]}

**拼音：** ${d["4"]}

**统一码：** ${unicode}

[汉典](https://www.zdic.net/hans/${char}) &nbsp; [字统](https://zi.tools/zi/${char}) &nbsp; [国学](https://www.guoxuedashi.net/zidian/${hex}.html)`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const chars = searchText ? [...searchText].filter((ch) => data[ch]) : [];

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="输入汉字..."
      isShowingDetail={chars.length > 0}
    >
      {chars.map((char, i) => {
        const d = data[char];
        return (
          <List.Item
            key={`${char}-${i}`}
            title={char}
            subtitle={d["1"]}
            detail={<List.Item.Detail markdown={buildMarkdown(char, d)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="复制编码" content={d["1"]} />
                <Action.CopyToClipboard title="复制拆分" content={d["3"]} />
                <Action.OpenInBrowser
                  title="汉典"
                  url={`https://www.zdic.net/hans/${char}`}
                />
                <Action.OpenInBrowser
                  title="字统"
                  url={`https://zi.tools/zi/${char}`}
                />
                <Action.OpenInBrowser
                  title="国学"
                  url={`https://www.guoxuedashi.net/zidian/${char.codePointAt(0)!.toString(16).toUpperCase()}.html`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
