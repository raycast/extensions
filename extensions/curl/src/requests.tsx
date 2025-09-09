import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import axios from "axios";
import ResultView from "./views/Result";
import RequestDetails from "./views/RequestDetails";
import { methodColors } from "../utils";
import { JSONPath } from "jsonpath-plus";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const curlString = require("curl-string");

export interface Values {
  key: string;
  value: string;
}

interface RequestArg {
  url: string;
  payload: string;
}

export default function Requests() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState("");
  const [requests, setRequests] = useState<Values[]>();
  const { push } = useNavigation();

  useEffect(() => {
    getRequests().then((result) => {
      setRequests(
        result.filter((req) => {
          const parsedValue = JSON.parse(req.value);
          return (
            req.key.includes(searchText) || parsedValue?.meta?.title.toLowerCase().includes(searchText.toLowerCase())
          );
        }),
      );
      setIsLoading(false);
    });

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
      ...(payload.method !== "GET" &&
        payload.method !== "DELETE" && {
          data: {
            ...JSON.parse(JSON.stringify(payload.data).replace("```\n\b\b", "")),
          },
        }),
    };

    const generatedCurl = curlString(request.url, curlOptions);

    const { meta, ...payloadWithoutMeta } = payload;
    axios({ ...payloadWithoutMeta })
      .then(async (res) => {
        response = res;

        const jsonPathQuery = meta?.jsonPathQuery || "";
        const jsonPathQueryResult = JSONPath({ wrap: false, path: jsonPathQuery, json: response.data });

        const result = { method: payload.method, response };

        push(<ResultView result={result as never} curl={generatedCurl} jsonPathResult={jsonPathQueryResult} />);
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
    const options: Alert.Options = {
      title: "Delete All History",
      message: "Are you sure you want to delete all history?",
      primaryAction: {
        title: "Yes",
        onAction: async () => {
          await LocalStorage.clear();
          setRequests([]);
        },
      },
    };
    await confirmAlert(options);
  };

  const generateCurl = (request: RequestArg) => {
    const payload = JSON.parse(request.payload);
    const curlOptions = {
      method: payload.method,
      headers: payload.headers,
      ...(payload.method !== "GET" &&
        payload.method !== "DELETE" && {
          data: {
            ...JSON.parse(JSON.stringify(payload.data).replace("```\n\b\b", "")),
          },
        }),
    };

    const generatedCurl = curlString(request.url, curlOptions);
    return generatedCurl;
  };

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText} searchBarPlaceholder="Search URL">
      {requests?.map((req: Values) => {
        const value = JSON.parse(req.value);
        const methodColor = (methodColors as { [index: string]: Color })[value.method];
        return (
          <List.Item
            key={req.key}
            title={value?.meta?.title ? value?.meta?.title : `${value.url}`}
            accessories={[
              { text: "Copy cURL", icon: Icon.CopyClipboard },
              { tag: { color: methodColor, value: value.method } },
              ...(value.method != "GET" && value.method != "DELETE"
                ? [{ tag: "Body", tooltip: value.data ? JSON.stringify(value.data) : "" }]
                : []),
            ]}
            subtitle={value?.meta?.description ? value?.meta?.description : ""}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action.CopyToClipboard
                    title="Copy Curl"
                    content={generateCurl({ url: req.key, payload: req.value })}
                  />
                  <Action
                    title="Run"
                    icon={Icon.Rocket}
                    onAction={() => handleRunRequest({ url: req.key, payload: req.value })}
                  />
                  <Action.Push
                    title="Add Metadata"
                    target={<RequestDetails req={req} />}
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Delete">
                  <Action
                    title="Delete from History"
                    icon={Icon.Trash}
                    onAction={() => handleDeleteItem(req.key)}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    style={Action.Style.Destructive}
                  />
                  <Action
                    title="Delete All History"
                    icon={Icon.Trash}
                    onAction={handleDeleteAll}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "delete" }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
