import { ActionPanel, Detail, Icon, List, Action, useNavigation } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { spawn } from "child_process";

interface Result {
  title: string;
  url: string;
  summary: string;
}

interface State {
  result: Result[];
  isLoading: boolean;
  query: string | null;
  validDomain: boolean | string;
}

export default function DigSearchResultsList() {
  const [state, setState] = useState<State>({ result: [], isLoading: false, query: null, validDomain: false });
  const { push } = useNavigation();
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetch() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      if (!state.query) {
        setState((previous) => ({ ...previous, result: [] }));
        return;
      }

      // Only run if domain is found
      const queryArr = state.query.split(" ");
      const domainMatch = queryArr[0].match(
        /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi
      );

      if (!domainMatch) {
        setState((previous) => ({ ...previous, result: [] }));
        return;
      }

      setState((previous) => ({ ...previous, isLoading: true, validDomain: !!domainMatch }));

      try {
        const results = await digByQuery(state.query, cancelRef.current.signal);
        setState((previous) => ({ ...previous, result: results, isLoading: false }));
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
      } finally {
        setState((previous) => ({ ...previous, isLoading: false }));
      }
    }
    fetch();

    return function () {
      cancelRef.current?.abort();
    };
  }, [state.query]);

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Type a valid Hostname (ex. raycast.com or raycast.com mx)"
      onSearchTextChange={(text) => setState((previous) => ({ ...previous, query: text }))}
      throttle
    >
      <ListWithEmptyView validDomain={state.validDomain} query={state.query} />

      {state.result.map((result, idx) => (
        <List.Item
          id={idx.toString()}
          key={idx}
          title={result.title}
          icon="icon.png"
          accessories={[{ text: result.summary }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Destination" content={result.summary} />
              <Action.OpenInBrowser url={result.url} />
              <Action
                title="Show NS-record Details"
                icon={Icon.Sidebar}
                onAction={() => push(<Details {...result} />)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Details(props: Result) {
  const { title, summary, url } = props;

  return (
    <Detail
      markdown={`# ${title}\n## Destination:\n\`\`\`\n${summary}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Destination" content={summary} />
        </ActionPanel>
      }
    />
  );
}

export const ListWithEmptyView = (props: any) => {
  const { validDomain, query } = props;

  return (
    <List.EmptyView
      title={query && !!validDomain ? "No records found" : "Type hostname to search"}
      icon={Icon.QuestionMark}
    />
  );
};

function getNSEntry(cmdLine: string) {
  const n = cmdLine.split(" ");
  return n[n.length - 1];
}

async function digByQuery(query: string, signal: AbortSignal): Promise<Result[]> {
  try {
    const str = query.trim();
    const params: string[] = [];
    const output = [];
    const queryArr = str.split(" ");
    let data = "";

    // Check if string have options
    if (queryArr.length > 1) {
      const query = queryArr[0].trim();
      const option = queryArr[1].trim();

      params.push("-t", option, query);
    } else {
      params.push(str);
    }

    const child = spawn("host", params, { signal });
    child.stdout.setEncoding("utf-8");

    for await (const chunk of child.stdout) {
      data += chunk;
    }

    // Check for errors in data
    if (data.includes("not found")) {
      return Promise.resolve([]);
    }

    // Split lines into array:
    const execReturnDataArr = data.split("\n");

    // Loop stdout lines:
    for (const val of execReturnDataArr) {
      // Grab summary:
      const sum = getNSEntry(val);

      // If not empty push into x arr:
      if (val && sum) {
        output.push({
          title: val,
          summary: sum,
          url: "https://www.nslookup.io/dns-records/" + query,
        });
      }
    }

    return output;
  } catch (e) {
    return Promise.resolve([]);
  }
}
