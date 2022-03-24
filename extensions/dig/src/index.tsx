import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
const { execSync } = require("child_process");

//const execSync2 = require('child_process').execSync;
//const execSync2 = execSync;
//var execSync2 = require('execSync');

export default function DigSearchResultsList() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetch() {
      if (!query) {
        setState([]);
        return;
      }
      setIsLoading(true);
      const results = await digByQuery(query);
      setState(results);
      setIsLoading(false);
    }
    fetch();
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type a valid Hostname (ex. raycast.com or raycast.com mx)"
      onSearchTextChange={(text) => setQuery(text)}
      throttle
    >
      {state.map((result, idx) => (
        <List.Item
          id={idx.toString()}
          key={idx}
          title={result.title}
          icon="icon.png"
          accessories={[{ text: result.summary }]}
          actions={
            <ActionPanel>
              <CopyToClipboardAction title="Copy Destination" content={result.summary} />
              <OpenInBrowserAction url={result.url} />
              <ActionPanel.Item
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
          <OpenInBrowserAction url={url} />
          <CopyToClipboardAction title="Copy Destination" content={summary} />
        </ActionPanel>
      }
    />
  );
}

type digResponse = {
  documents: Array<{
    title: string;
    mdn_url: string;
    summary: string;
  }>;
};

type Result = {
  title: string;
  url: string;
  summary: string;
};

function getNSEntry(cmdLine: string) {
  const n = cmdLine.split(" ");
  return n[n.length - 1];
}

function hasWhiteSpace(s: string) {
  return s.indexOf(" ") >= 0;
}

async function digByQuery(query: string): Promise<Result[]> {
  try {
    // Prepare:
    const str = query.trim();
    const cmd = "";

    // Check if string have options:
    if (hasWhiteSpace(str)) {
      const queryArr = str.split(" ");
      const query = queryArr[0].trim();
      const option = queryArr[1].trim();
      const cmd = "host -t " + option + " " + query;
    } else {
      const cmd = "host " + query;
    }

    // Define execOptions:
    const options = {
      encoding: "utf8",
    };

    // Execute command:

    const execReturnData = execSync(cmd, options);

    // Split lines into array:
    const execReturnDataArr = execReturnData.split("\n");

    // Prepare Output:
    const x = [];

    // Loop stdout lines:
    for (const val of execReturnDataArr) {
      // Grab summary:
      const sum = getNSEntry(val);

      // If not empty push into x arr:
      if (val && sum) {
        x.push({
          title: val,
          summary: sum,
          url: "https://www.nslookup.io/dns-records/" + query,
        });
      }
    }

    // Return x arr
    return x;
  } catch (e) {
    showToast(ToastStyle.Failure, `Could not resolve domain`);
    return Promise.resolve([]);
  }
}
