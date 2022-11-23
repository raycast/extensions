import { ActionPanel, Action, List, Detail, Icon, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parseEDNString } from "edn-data";

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
  let res: DocInfo[] | undefined | void, loading: boolean;

  if (cached) {
    res = JSON.parse(cached);
    loading = false;
  } else {
    const { isLoading, data } = useFetch(
      "https://github.com/clojure-emacs/clojuredocs-export-edn/raw/master/exports/export.compact.edn",
      {
        keepPreviousData: true,
        parseResponse: async (response) => {
          cache.set(
            "items",
            JSON.stringify(
              getDocList(parseEDNString(await response.text(), { mapAs: "object", keywordAs: "string" }) as Doc)
            )
          );
        },
      }
    );

    res = data;
    loading = isLoading;
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search..." throttle>
      {(res || []).map((result, index) => (
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

   ${res["see-alsos"] == null ? "No see also" : res["see-alsos"]?.map((res) => "`" + res +"`").join(" ")}

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
      accessoryTitle={searchResult.type}
      actions={
        <ActionPanel>
          <Action.Push
            title="Go to Detail"
            icon={Icon.AppWindowSidebarRight}
            target={<CljDetail res={searchResult} />}
          />
          <ActionPanel.Section>
            <Action.OpenInBrowser url={"https://clojuredocs.org" + searchResult.href} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
