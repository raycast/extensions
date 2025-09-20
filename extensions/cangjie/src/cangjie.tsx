import { Action, ActionPanel, List, getSelectedText } from "@raycast/api";
import { useState, useEffect } from "react";
import cangjieData from "./cangjie5_all.json";

type CangjieDictionary = {
  [key: string]: string;
};

const data = cangjieData as CangjieDictionary;

const cangjieToChinese: { [key: string]: string } = {
  a: "日",
  b: "月",
  c: "金",
  d: "木",
  e: "水",
  f: "火",
  g: "土",
  h: "竹",
  i: "戈",
  j: "十",
  k: "大",
  l: "中",
  m: "一",
  n: "弓",
  o: "人",
  p: "心",
  q: "手",
  r: "口",
  s: "尸",
  t: "廿",
  u: "山",
  v: "女",
  w: "田",
  x: "難",
  y: "卜",
};

interface SearchResult {
  character: string;
  code: string;
}

type InputMethod = "cangjie" | "sucheng";

function SearchListItem({ searchResult, inputMethod }: { searchResult: SearchResult; inputMethod: InputMethod }) {
  // For Sucheng, only take first and last character if code length > 1
  const processedCode =
    inputMethod === "sucheng" && searchResult.code.length > 1
      ? searchResult.code[0] + searchResult.code[searchResult.code.length - 1]
      : searchResult.code;

  const spacedCode = processedCode.toUpperCase().split("").join(" ");

  const chineseCode = processedCode
    .toLowerCase()
    .split("")
    .map((char) => cangjieToChinese[char] || char);

  return (
    <List.Item
      title={searchResult.character}
      accessories={[
        {
          text: chineseCode.join(" "),
          tooltip: "Chinese radicals",
        },
        {
          text: spacedCode,
          tooltip: "English letters",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Radicals" content={chineseCode.join("")} />
          <Action.CopyToClipboard title="Copy Keys" content={processedCode} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [inputMethod, setInputMethod] = useState<InputMethod>("cangjie");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getInitialText() {
      try {
        const selectedText = await getSelectedText();
        if (selectedText) {
          setSearchText(selectedText);
        }
      } catch (error) {
        setSearchText("");
      } finally {
        setIsLoading(false);
      }
    }
    getInitialText();
  }, []);

  const lookupCodes = (text: string): SearchResult[] => {
    return text
      .split("")
      .filter((char) => Object.prototype.hasOwnProperty.call(data, char))
      .map((char) => ({
        character: char,
        code: data[char],
      }));
  };

  const results = searchText ? lookupCodes(searchText) : [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter Chinese characters..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Input Method"
          storeValue={true}
          onChange={(newValue) => setInputMethod(newValue as InputMethod)}
        >
          <List.Dropdown.Item title="Cangjie" value="cangjie" />
          <List.Dropdown.Item title="Sucheng" value="sucheng" />
        </List.Dropdown>
      }
    >
      {results.length > 0 ? (
        <List.Section title="Chinese characters" subtitle={String(results.length)}>
          {results.map((result, index) => (
            <SearchListItem key={index} searchResult={result} inputMethod={inputMethod} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon="🔍"
          title={searchText ? "No result" : "Type to search"}
          description={searchText ? "No Chinese characters found" : ""}
        />
      )}
    </List>
  );
}
