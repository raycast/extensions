import { List, Cache, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

const cache = new Cache();
const SEARCH_TEXT_KEY = "searchTextJava";
const BASE_URL = "https://github.wpilib.org/allwpilib/docs/release/java/";

type ClassItem = {
  name: string;
  url: string;
  path: string;
  methods: Array<{ name: string; signature: string; url: string }>;
};

interface JavaTypeEntry {
  p: string;
  l: string;
}

interface JavaMemberEntry {
  p: string;
  c: string;
  l: string;
}

interface JavaMethod {
  name: string;
  url: string;
}

interface JavaClassEntry {
  name: string;
  package: string;
  url: string;
  path: string;
  methods: JavaMethod[];
}

async function getDocumentation() {
  try {
    const memberResponse = await fetch("https://github.wpilib.org/allwpilib/docs/release/java/member-search-index.js");
    const memberText = await memberResponse.text();
    const memberJson = JSON.parse(
      memberText.replace(/^memberSearchIndex = /, "").replace(/;updateSearchResults\(\);$/, ""),
    ) as JavaMemberEntry[];

    const typeResponse = await fetch("https://github.wpilib.org/allwpilib/docs/release/java/type-search-index.js");
    const typeText = await typeResponse.text();
    const typeJson = JSON.parse(
      typeText.replace(/^typeSearchIndex = /, "").replace(/;updateSearchResults\(\);$/, ""),
    ) as JavaTypeEntry[];

    const classes = typeJson
      .filter((type) => type.p && type.l)
      .map((type) => {
        const members = memberJson.filter((member) => member.p === type.p && member.c === type.l);
        const path = `${type.p.replaceAll(".", "/")}/${type.l}.html`;

        return {
          name: type.l,
          package: type.p,
          url: `${BASE_URL}${path}`,
          path,
          methods: members.map((m) => ({
            name: m.l,
            url: `${BASE_URL}${path}#${m.l}`,
          })),
        };
      });

    return classes;
  } catch (error) {
    console.log(error);
  }
}

function getClassMarkdown(item: ClassItem): string {
  let markdown = "";
  markdown += `## ${item.name}\n\n`;
  markdown += `*${item.path.replace(".html", "").replace("edu/wpi/first/", "")}*\n\n`;

  if (item.methods.length === 0) return markdown + `## No methods available.`;

  markdown += `### Methods\n\n`;

  const grouped = new Map<string, typeof item.methods>();
  for (const method of item.methods) {
    if (!grouped.has(method.name)) grouped.set(method.name, []);
    grouped.get(method.name)!.push(method);
  }

  for (const [, overloads] of grouped) {
    for (const method of overloads) {
      markdown += `- ${method.name}\n\n`;
    }
    markdown += `---\n\n`;
  }

  return markdown;
}

function getClassKeywords(item: ClassItem): string[] {
  return item.methods.map((m) => m.name);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<JavaClassEntry[] | null>(() => {
    const cachedDocs = cache.get("wpilibJavaDocumentation");
    if (typeof cachedDocs === "string") {
      try {
        return JSON.parse(cachedDocs) as JavaClassEntry[];
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

    cache.set("wpilibJavaDocumentation", JSON.stringify(docs ?? []));
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
      isShowingDetail
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
            detail={<List.Item.Detail markdown={getClassMarkdown(item)} />}
            keywords={getClassKeywords(item)}
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
