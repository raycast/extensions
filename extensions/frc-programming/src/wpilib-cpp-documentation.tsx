import { List, Cache, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

const cache = new Cache();
const SEARCH_TEXT_KEY = "searchTextCpp";
const BASE_URL = "https://github.wpilib.org/allwpilib/docs/release/cpp/";

interface CppClassEntry {
  name: string;
  url: string;
  path: string;
  tag: string;
}

async function getDocumentation() {
  const allClasses = [];
  for (let i = 0; i < 20; i++) {
    try {
      const response = await fetch(`${BASE_URL}search/classes_${i}.js`);
      const text = await response.text();
      const stripped = text
        .replace(/^var searchData=\n/, "")
        .trim()
        .replace(/;$/, "");
      const jsonSafe = stripped.replace(/'/g, '"').replace(/,\s*\]/g, "]");
      const json = JSON.parse(jsonSafe);

      for (const entry of json) {
        const [, details] = entry;
        const name = details[0];
        if (name.includes("&lt;")) continue;
        if (name.includes("_wpi_proto_")) continue;
        const path = details[1][0].replace("../", "");
        const tag = details[1][2];

        allClasses.push({
          name,
          url: `${BASE_URL}${path}`,
          path,
          tag,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
  const uniqueClasses = Array.from(new Map(allClasses.map((c) => [c.url, c])).values());
  return uniqueClasses;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<CppClassEntry[] | null>(() => {
    const cachedDocs = cache.get("wpilibCppDocumentation");
    if (typeof cachedDocs === "string") {
      try {
        return JSON.parse(cachedDocs) as CppClassEntry[];
      } catch (error) {
        console.log(error);
        return null;
      }
    }
    return cachedDocs ?? null;
  });

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    cache.set(SEARCH_TEXT_KEY, text);
  };

  const fetchDocumentation = async () => {
    if (loading) return;

    setLoading(true);

    const docs = await getDocumentation();

    cache.set("wpilibCppDocumentation", JSON.stringify(docs ?? []));
    setData(docs ?? []);
    setLoading(false);
    setSearchText("");
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      filtering={true}
      searchBarPlaceholder="Search WPILib Documentation"
      isLoading={loading}
      actions={
        <ActionPanel title="">
          <Action title="Fetch Documentation" onAction={fetchDocumentation} />
        </ActionPanel>
      }
    >
      {data &&
        !loading &&
        data.map((item) => (
          <List.Item
            key={item.url}
            title={item.name}
            accessories={item.tag ? [{ tag: item.tag }] : undefined}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action title="Fetch Documentation" onAction={fetchDocumentation} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
