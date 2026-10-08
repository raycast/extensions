import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Detail, Icon, Cache, Color } from "@raycast/api";
import { parseEDNString } from "edn-data";
import fetch from "node-fetch";

interface DocInfo {
  added: string;
  ns: string;
  name: string;
  file: string;
  type: string;
  column: number;
  "see-alsos": string[];
  line: number;
  examples: string[];
  notes: string[];
  arglists: string[];
  doc: string;
  "library-url": string;
  href: string;
}

interface Doc {
  docInfo: DocInfo;
}

function getDocList(data: Doc): DocInfo[] {
  const docList: DocInfo[] = [];
  Object.entries(data).find(([, value]) => {
    docList.push(value);
  });
  return docList;
}

export default function Command() {
  const cache = new Cache();
  const cached = cache.get("items");
  const [result, setResult] = useState({ data: [] as DocInfo[], isLoading: true });

  if (cached) {
    useEffect(() => {
      setResult({ data: JSON.parse(cached), isLoading: false });
    }, [result.isLoading]);
  } else {
    useEffect(() => {
      const fetchData = async () => {
        const data = await fetch(
          "https://github.com/clojure-emacs/clojuredocs-export-edn/raw/master/exports/export.compact.min.edn"
        );
        const text = await data.text();
        const res = getDocList(parseEDNString(text, { mapAs: "object", keywordAs: "string" }) as Doc);
        cache.set("items", JSON.stringify(res));
        setResult({ data: res, isLoading: false });
      };
      fetchData().catch(console.error);
    }, [result.isLoading]);
  }

  return (
    <List searchBarPlaceholder="Search..." isLoading={result.isLoading} throttle>
      {(result.data || []).map((result, index) => (
        <SearchListItem key={index} searchResult={result} />
      ))}
    </List>
  );
}

const CljDetail = ({ res }: { res: DocInfo }) => {
  const mark = `
   # ${res.ns}/${res.name}

   _${res.type} (since ${res.added})_

   ---

   ${res.arglists.length == 0 ? "No args" : res.arglists?.map((arg) => "`(" + res.name + " " + arg + ")`").join(" ")}

   ~~~
   ${res.doc ?? "No doc"}
   ~~~

   ### ${res.examples == null ? "0" : res.examples.length} Examples

   ${res.examples == null ? "`No examples`" : res.examples?.map((e) => "~~~\n" + e + "\n~~~").join("\n")}

   ###  ${res["see-alsos"] == null ? "0" : res["see-alsos"].length} See Also(s)

   ${res["see-alsos"] == null ? "No see also" : res["see-alsos"]?.map((res) => "`" + res + "`").join(" ")}

   ### ${res.notes == null ? "0" : res.notes.length} Note(s)

   ${res.notes == null ? "`No notes`" : res.notes?.map((n) => "~~~\n" + n + "\n~~~").join("\n")}
  `;

  return (
    <>
      <Detail
        navigationTitle={res.ns + "/" + res.name}
        markdown={mark}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={"https://clojuredocs.org" + res.href} />
          </ActionPanel>
        }
      />
    </>
  );
};

function SearchListItem({ searchResult }: { searchResult: DocInfo }) {
  return (
    <List.Item
      title={searchResult.ns + "/" + searchResult.name}
      subtitle={searchResult.doc}
      accessories={[
        { tag: { value: searchResult.type, color: colorType(searchResult.type) }, tooltip: "Tag with tooltip" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.AppWindow} target={<CljDetail res={searchResult} />} />
          <ActionPanel.Section>
            <Action.OpenInBrowser url={"https://clojuredocs.org" + searchResult.href} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function colorType(type: string) {
  switch (type) {
    case "function":
      return Color.PrimaryText;
    case "macro":
      return Color.Green;
    case "var":
      return Color.Blue;
    default:
      return Color.Red;
  }
}
