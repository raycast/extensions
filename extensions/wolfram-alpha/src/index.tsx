import {
  ActionPanel,
  Detail,
  Form,
  useNavigation,
  showToast,
  getPreferenceValues,
  environment,
  Icon,
  Action,
  Toast,
} from "@raycast/api";
import { useState } from "react";

interface Preferences {
  appId: string;
  units?: string;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const { push } = useNavigation();

  const theme = environment.appearance || null;

  const onSubmit = async () => {
    if (!query) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter something to query",
      });
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        appid: preferences.appId,
        i: query,
        width: `${474 * 2}`,
        units: preferences.units || "metric",
        fontsize: `${14 * 2}`,
      });
      if (theme) {
        params.append("background", "transparent");
        params.append("foreground", theme === "light" ? "black" : "white");
      }
      const res = await fetch(`https://api.wolframalpha.com/v1/simple?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid App ID",
            message: "Update the App ID in the preferences",
          });
          return;
        }
        throw new Error(res.statusText);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      push(
        <Detail
          markdown={
            // `![${query}](https://api.wolframalpha.com/v1/simple?${params.toString()})`
            `![${query}](data:${res.headers.get("content-type")};charset=utf-8;base64,${buffer.toString("base64")})`
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://www.wolframalpha.com/input/?i=${encodeURIComponent(query)}`} />
            </ActionPanel>
          }
        />,
      );
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not query WolframAlpha",
        message: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} title="Query" icon={Icon.MagnifyingGlass} />
          <Action.OpenInBrowser url={`https://www.wolframalpha.com/input/?i=${encodeURIComponent(query)}`} />
        </ActionPanel>
      }
      isLoading={loading}
    >
      <Form.TextField
        title="Wolfram query"
        placeholder="Einstein curve"
        id="query"
        onChange={(query) => setQuery(query)}
        storeValue
      />
    </Form>
  );
}
