import { Action, ActionPanel, Clipboard, Form, Icon, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { URL } from "url";

type Values = {
  url: string;
  name?: string;
  source?: string;
  medium?: string;
  content?: string;
  term?: string;
};

function processParam(param: string) {
  return param.replace(/\s+/g, "+");
}

function createCampaignUrl(values: Values) {
  const searchParams = new URLSearchParams();
  if (values.name) searchParams.set("utm_campaign", processParam(values.name));
  if (values.source) searchParams.set("utm_source", processParam(values.source));
  if (values.medium) searchParams.set("utm_medium", processParam(values.medium));
  if (values.content) searchParams.set("utm_content", processParam(values.content));
  if (values.term) searchParams.set("utm_term", processParam(values.term));

  const url = new URL(values.url);
  url.search = searchParams.toString();

  return url.toString();
}

export default function Command(props: LaunchProps<{ draftValues: Values; arguments: Arguments.Index }>) {
  let initialUrl: URL | undefined;
  try {
    const { utm } = props.arguments;
    if (utm) {
      initialUrl = new URL(utm);
    }
  } catch (error) {
    showFailureToast("Invalid initial URL");
  }

  const { handleSubmit, itemProps, values } = useForm<Values>({
    async onSubmit(values) {
      const url = createCampaignUrl(values);
      await Clipboard.copy(url);
      await showHUD("Copied to Clipboard");
      await popToRoot();
    },
    initialValues: {
      url: props.draftValues?.url || initialUrl?.origin,
      name: (props.draftValues?.name || initialUrl?.searchParams.get("utm_campaign")) ?? undefined,
      source: (props.draftValues?.source || initialUrl?.searchParams.get("utm_source")) ?? undefined,
      medium: (props.draftValues?.medium || initialUrl?.searchParams.get("utm_medium")) ?? undefined,
      content: (props.draftValues?.content || initialUrl?.searchParams.get("utm_content")) ?? undefined,
      term: (props.draftValues?.term || initialUrl?.searchParams.get("utm_term")) ?? undefined,
    },
    validation: {
      url: (value) => {
        try {
          if (value) {
            new URL(value);
          } else {
            return "The item is required";
          }
        } catch (error) {
          return "Invalid URL";
        }
      },
    },
  });

  let url;
  try {
    url = createCampaignUrl({
      ...values,
      url: values.url ?? "https://raycast.com",
    });
  } catch {
    url = values.url;
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.CopyClipboard} title="Copy to Clipboard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="Website URL" placeholder="https://raycast.com" storeValue />
      <Form.TextField
        {...itemProps.name}
        title="Campaign name"
        placeholder="Promo Code"
        info="Used for identifying a specific campaign."
      />
      <Form.TextField
        {...itemProps.source}
        title="Campaign source"
        placeholder="Google"
        info="The source of the campaign such as a search engine, newsletter name, or referrer."
      />
      <Form.TextField
        {...itemProps.medium}
        title="Campaign medium"
        placeholder="Email"
        info="Describes the type of the link to your website."
      />
      <Form.TextField
        {...itemProps.content}
        title="Campaign content"
        placeholder="Image Link"
        info="Used for A/B testing and content-targeted ads."
      />
      <Form.TextField
        {...itemProps.term}
        title="Campaign term"
        placeholder="Running Shoes"
        info="Used for paid search. Used to note the keywords for this campaign."
      />
      <Form.Separator />
      <Form.Description text={decodeURIComponent(url)} />
    </Form>
  );
}
