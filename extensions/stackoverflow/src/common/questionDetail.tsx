import { ActionPanel, Detail, useNavigation, Icon, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { assertStringProp, assertArrayProp } from "./typeUtils";

export function QuestionDetail(props: { quid: string; url: string; title: string }) {
  const { markdown, error, isLoading } = getDetails(props.quid);
  const { pop } = useNavigation();
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Pipelines", error);
  }
  return (
    <Detail isLoading={isLoading} navigationTitle={props.title} markdown={markdown}>
      <ActionPanel title="Open">
        <ActionPanel.Item title="Pop Back" icon={Icon.Binoculars} onAction={pop} />
      </ActionPanel>
    </Detail>
  );
}

export function getDetails(query: string): {
  markdown: string;
  error?: string;
  isLoading: boolean;
} {
  const [markdown, setMarkdown] = useState<string>("## Question is Loading...");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const requestOptions = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
          },
        };

        const q = `https://api.stackexchange.com/2.3/questions/${query}?order=desc&sort=activity&site=stackoverflow&filter=!6VvPDzPz(ezQY`;
        const response = await fetch(q, requestOptions);
        if (response.status !== 200) {
          const data = (await response.json()) as { message?: unknown } | undefined;
          throw new Error(`${data?.message || "Not OK"}`);
        }
        const data = await response.json();
        if (!cancel) {
          assertArrayProp(data, "items");
          const x_data = data.items[0];
          assertStringProp(x_data, "body_markdown");
          setMarkdown(x_data.body_markdown);
        }
      } catch (e) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { markdown, error, isLoading };
}
