import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import axios from "axios";
import ResultView from "./views/Result";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const curlString = require("curl-string");

interface Values {
  key: string;
  value: string;
}

interface RequestArg {
  url: string;
  payload: string;
}

export default function Requests() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState("");
  const [requests, setRequests] = useState<Values[]>();
  const { push } = useNavigation();

  useEffect(() => {
    getRequests().then((result) => setRequests(result.filter((req) => req.key.includes(searchText))));

    async function getRequests() {
      const values = await LocalStorage.allItems();
      return Object.entries(values).map((request) => ({ key: request[0], value: request[1] }));
    }
  }, [searchText]);

  const handleRunRequest = async (request: RequestArg) => {
    let response;
    const payload = JSON.parse(request.payload);
    const curlOptions = {
      method: payload.method,
      headers: payload.headers,
      ...(payload.method !== "GET" && {
        data: {
          ...JSON.parse(payload.body.replace("```\n\b\b", "")),
        },
      }),
    };

    const generatedCurl = curlString(request.url, curlOptions);

    axios({ ...payload })
      .then(async (res) => {
        response = res;
        const result = { method: payload.method, response };

        push(<ResultView result={result as never} curl={generatedCurl} />);
      })
      .catch((err) => {
        showToast({
          title: "Error",
          message: err.message,
          style: Toast.Style.Failure,
        });
      })
      .finally(() => setIsLoading(false));
  };

  const handleDeleteItem = async (url: string) => {
    await LocalStorage.removeItem(url);
    const newRequests = requests?.filter((req) => req.key !== url);
    setRequests(newRequests);
  };

  const handleDeleteAll = async () => {
    await LocalStorage.clear();
    setRequests([]);
  };

  const generateCurl = (request: RequestArg) => {
    const payload = JSON.parse(request.payload);
    const curlOptions = {
      method: payload.method,
      headers: payload.headers,
      ...(payload.method !== "GET" && {
        data: {
          ...JSON.parse(payload.body.replace("```\n\b\b", "")),
        },
      }),
    };

    const generatedCurl = curlString(request.url, curlOptions);
    return generatedCurl;
  };

  return (
    <List
      isLoading={isLoading}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search requests"
      searchBarPlaceholder="Search URL"
    >
      {requests?.map((req: Values) => {
        const value = JSON.parse(req.value);
        return (
          <List.Item
            key={req.key}
            title={`${value.method} ${req.key}`}
            accessories={[{ text: "Copy cURL", icon: Icon.CopyClipboard }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy cURL"
                  content={generateCurl({ url: req.key, payload: req.value })}
                />
                <Action title="Run" onAction={() => handleRunRequest({ url: req.key, payload: req.value })} />
                <Action
                  title="Delete From History"
                  onAction={() => handleDeleteItem(req.key)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
                <Action
                  title="Delete All History"
                  onAction={handleDeleteAll}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
