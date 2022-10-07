import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
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
  const { isLoading, data } = useFetch(
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
    <List isLoading={isLoading} searchBarPlaceholder="Search..." throttle>
      {(data || []).map((result) => (
        <SearchListItem key={result.ns + "/" + result.name} searchResult={result} />
      ))}
    </List>
  );
}

const CljDetail = ({ res }: { res: DocInfo }) => {
  const mark = `
   # ${res.ns}/${res.name}

   ---

   ${res.arglists.length == 0 ? "No args" : res.arglists?.map((arg) => "`(" + res.name + " " + arg + ")`").join(" ")}

   ~~~
   ${res.doc ?? "No doc"}
   ~~~

   ### ${res.examples == null ? "0" : res.examples.length} Examples

   ${res.examples == null ? "`No examples`" : res.examples?.map((e) => "~~~\n" + e + "\n~~~").join("\n")}

   ### ${res.notes == null ? "0" : res.notes.length} Note(s)

   ${res.notes == null ? "`No notes`" : res.notes?.map((n) => "~~~\n" + n + "\n~~~").join("\n")}
  `;

  return (
    <>
      <Detail
        navigationTitle={res.ns + "/" + res.name}
        markdown={mark}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={res.type} />
            <Detail.Metadata.Label title="Available since" text={res.added} />
            <Detail.Metadata.Link title="Library" text={res.ns} target={res["library-url"]} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="See also">
              {(res["see-alsos"] || []).map((result) => (
                <Detail.Metadata.TagList.Item text={result} color={"#A9A9A9"} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
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
