import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import MarkdownResult from "./components/MarkdownResult";
import { SnapRenderError, normalizeUrl } from "./lib/api";
import { getActiveTabUrl } from "./lib/raycast";

function UrlForm() {
  const { push } = useNavigation();
  const [urlError, setUrlError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Read Page"
            icon={Icon.Document}
            onSubmit={(values: { url: string }) => {
              try {
                push(<MarkdownResult url={normalizeUrl(values.url)} nested />);
              } catch (error) {
                setUrlError(error instanceof SnapRenderError ? error.detail : "Enter a valid URL");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/article"
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.Description text="No browser tab was found, so enter the page to read. Each read uses one capture from your monthly allowance." />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ReadPage }>) {
  const argumentUrl = props.arguments.url?.trim();
  const { data: target, isLoading } = usePromise(async () => {
    if (argumentUrl) return argumentUrl;
    return (await getActiveTabUrl()) ?? "";
  }, []);

  if (isLoading) return <Detail isLoading markdown="" />;
  if (!target) return <UrlForm />;

  let url: string;
  try {
    url = normalizeUrl(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return <Detail markdown={`## Could not read page\n\n${message}`} />;
  }
  return <MarkdownResult url={url} />;
}
