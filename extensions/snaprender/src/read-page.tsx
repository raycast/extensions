import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import MarkdownResult from "./components/MarkdownResult";
import { normalizeUrl, urlValidationError } from "./lib/api";
import { getActiveTabUrl } from "./lib/raycast";

function UrlForm() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ url: string }>({
    validation: { url: urlValidationError },
    onSubmit: (values) => {
      push(<MarkdownResult url={normalizeUrl(values.url)} nested />);
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Read Page" icon={Icon.Document} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://example.com/article" {...itemProps.url} />
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
