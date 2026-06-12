import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  LaunchProps,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { IPData, Preferences } from "./types";
import { fetchIPData } from "./utils/api";
import { addToHistory } from "./utils/history";
import { IPDetail } from "./components/ip-detail";
import { validateQuery } from "./utils/validation";

export default function LookupIP(
  props: LaunchProps<{ arguments: { query: string } }>,
) {
  const { apiKey, plan } = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState(props.arguments.query?.trim() || "");
  const [data, setData] = useState<IPData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFormSubmit(values: { query: string }) {
    const cleaned = values.query?.trim() || "";
    if (!cleaned) return;
    setQuery(cleaned);
  }

  useEffect(() => {
    if (!query) {
      Clipboard.readText().then((text) => {
        const cleaned = text?.trim() || "";
        if (!cleaned) return;
        try {
          validateQuery(cleaned);
          setQuery(cleaned);
        } catch {
          // Clipboard text isn't a valid IP or domain — ignore it.
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        // validateQuery inside async so throws become toasts, not render crashes
        const validQuery = validateQuery(query);
        const result = await fetchIPData(validQuery, apiKey, plan);
        if (!cancelled) {
          setData(result);
          await addToHistory({
            query: validQuery,
            data: result,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        if (!cancelled) {
          const message = String(e).replace("Error: ", "");
          setError(message);
          showToast({
            style: Toast.Style.Failure,
            title: "Lookup failed",
            message,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Lookup" onSubmit={handleFormSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="query"
          title="IP or domain"
          placeholder="8.8.8.8 or google.com"
          defaultValue={props.arguments.query?.trim() || ""}
        />
      </Form>
    );
  }

  return (
    <IPDetail
      data={data}
      isLoading={isLoading}
      error={error}
      onSearchAnother={() => {
        setData(null);
        setQuery("");
        setError(null);
      }}
    />
  );
}
