import { ActionPanel, Detail, LaunchProps, Action, getPreferenceValues, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch, { HeadersInit } from "node-fetch";

interface CommandArguments {
  question: string;
}

interface Preferences {
  host: string;
  apiKey?: string;
}

interface RequestBody {
  helpful?: boolean | null;
  question?: string;
  response?: string;
}

function makeRequest(endpoint: string, method: string = "GET", body?: RequestBody) {
  const { host, apiKey } = getPreferenceValues<Preferences>();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey || "M3rryChr!stm@s",
  };

  return fetch(`${host}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { question } = props.arguments;
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await makeRequest(`/llm/quick_reply?msg=${encodeURIComponent(question)}`);
        const result = await response.text();
        const formattedResult = result.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
        console.log(result);
        console.log(formattedResult);
        setData(formattedResult);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [question]);

  return (
    <Detail
      markdown={data}
      isLoading={isLoading}
      navigationTitle={question}
      actions={
        <ActionPanel>
          <Action
            title="👍 Helpful"
            onAction={async () => {
              await makeRequest("/llm/feedback", "POST", { helpful: true, question, response: data });
              await showToast({ title: "Noted to learn" });
            }}
          />
          <Action
            title="👎 Not Helpful"
            onAction={async () => {
              await makeRequest("/llm/feedback", "POST", { helpful: false, question, response: data });
              await showToast({ title: "Noted to learn" });
            }}
          />
          <Action.OpenInBrowser
            title="Close Without Feedback"
            url="raycast://pop"
            onOpen={() => {
              makeRequest("/llm/feedback", "POST", { helpful: null, question, response: data });
            }}
          />
          <Action.OpenInBrowser
            title="Edit Question"
            url="raycast://pop"
            onOpen={() => {
              makeRequest(`/llm/quick_reply?msg=${encodeURIComponent(question)}`);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
