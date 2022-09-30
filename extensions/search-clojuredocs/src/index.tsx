import { ActionPanel, Action, List, Detail } from "@raycast/api";
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
  const { isLoading, data, revalidate } = useFetch(
    "https://github.com/clojure-emacs/clojuredocs-export-edn/raw/master/exports/export.compact.edn",
    {
      // to make sure the screen isn't flickering when the searchText changes
      keepPreviousData: true,
      parseResponse: async (response) =>
        getDocList(parseEDNString(await response.text(), { mapAs: "object", keywordAs: "string" }) as Doc),
    }
  );
  // setList(getDocList(data));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ClojureDocs..." throttle>
      {(data || []).map((result) => (
        <SearchListItem key={result.ns + "/" + result.name} searchResult={result} />
      ))}
    </List>
  );
}

const CljDetail = ({ res }: { res: DocInfo }) => {
  const mark = `
   # ${res.ns}/${res.name}

   ~~~
   ${res.arglists.length == 0 ? "No args" : res.arglists?.join("\n")}
   ~~~

   ~~~
   ${res.doc ?? "No doc"}
   ~~~
   
   ${res.examples == null ? "" : "### " + res.examples.length + " Example(s)"}
   ~~~
   ${res.examples == null ? "No examples" : res.examples?.join("\n~~~\n~~~\n")}
   ~~~
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

function SearchListItem({ searchResult }: { searchResult: any }) {
  return (
    <List.Item
      title={searchResult.ns + "/" + searchResult.name}
      subtitle={searchResult.doc}
      accessoryTitle={searchResult.type}
      actions={
        <ActionPanel>
          <Action.Push title="Go to Detail..." target={<CljDetail res={searchResult} />} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={"https://clojuredocs.org" + searchResult.href} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
