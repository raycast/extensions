import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { markdownText, resultsMarkdown, searchGoogle } from "./lib/flashdata";
import type { SearchInput, SearchResponse } from "./lib/flashdata";

const WEBSITE = "https://flashdata.dev";

function Results({ query, response }: { query: string; response: SearchResponse }) {
  const { pop } = useNavigation();
  const copies = (
    <>
      <Action.CopyToClipboard title="Copy Results as JSON" content={JSON.stringify(response.raw, null, 2)} />
      <Action.CopyToClipboard title="Copy Results as Markdown" content={resultsMarkdown(query, response.results)} />
      <Action title="Edit Search" icon={Icon.Pencil} onAction={pop} />
      <Action.OpenInBrowser title="Open FlashData" url={WEBSITE} />
    </>
  );
  return (
    <List navigationTitle={query} searchBarPlaceholder="Filter returned results…" isShowingDetail>
      {response.results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Organic Results"
          description="The search completed. You can copy the full response or edit your query."
          actions={<ActionPanel>{copies}</ActionPanel>}
        />
      ) : (
        response.results.map((result, index) => (
          <List.Item
            key={`${index}-${result.url}`}
            title={result.title}
            icon={Icon.Globe}
            accessories={result.position === undefined ? [] : [{ text: `#${result.position}` }]}
            detail={
              <List.Item.Detail
                markdown={`${markdownText(result.snippet || "No snippet returned.")}\n\n${markdownText(result.url)}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="Source"
                      text={new URL(result.url).hostname}
                      target={result.url}
                    />
                    {result.position !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Position" text={String(result.position)} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={result.url} />
                <Action.CopyToClipboard title="Copy URL" content={result.url} />
                <Action.CopyToClipboard title="Copy Snippet" content={result.snippet} />
                {copies}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState<string>();
  const submitting = useRef(false);

  async function submit(values: SearchInput) {
    if (submitting.current) return;
    if (!values.query.trim()) {
      setQueryError("Enter a search query.");
      return;
    }
    submitting.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Searching Google" });
    try {
      const { apiKey } = getPreferenceValues<Preferences>();
      const response = await searchGoogle(values, apiKey);
      toast.style = Toast.Style.Success;
      toast.title = `${response.results.length} Results Returned`;
      push(<Results query={values.query.trim()} response={response} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Search Failed";
      toast.message = error instanceof Error ? error.message : "Check your FlashData query history before retrying.";
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Google" icon={Icon.MagnifyingGlass} onSubmit={submit} />
          <Action.OpenInBrowser title="Open API Documentation" url={`${WEBSITE}/docs/sources/google_search`} />
          <Action.OpenInBrowser title="Open FlashData" url={WEBSITE} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Query"
        placeholder="Search for official documentation, sources, or recent information…"
        error={queryError}
        onChange={() => setQueryError(undefined)}
      />
      <Form.TextField id="country" title="Country" placeholder="Optional country code, e.g. us" />
      <Form.TextField id="language" title="Language" placeholder="Optional language code, e.g. en" />
      <Form.TextField id="count" title="Result Count" defaultValue="10" placeholder="1–100" />
      <Form.TextField id="page" title="Page" defaultValue="1" placeholder="1–100" />
      <Form.Description text="Each submitted search uses Credits from your FlashData account. Typing and filtering results do not run searches. Actual result count may be lower than requested." />
    </Form>
  );
}
