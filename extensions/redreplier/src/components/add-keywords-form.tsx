import { Action, ActionPanel, Form, Icon, Keyboard, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { api } from "../lib/api";
import { APP_URL } from "../lib/client";
import { runWithToast } from "../lib/feedback";
import { addedKeywordsSummary, MAX_KEYWORD_LENGTH, parseKeywords, websiteName } from "../lib/format";
import { useWebsites } from "../lib/use-websites";

type AddKeywordsValues = {
  websiteId: string;
  keywords: string;
};

type AddKeywordsFormProps = {
  websiteId?: string;
  onAdded?: () => void;
  popAfterAdd?: boolean;
};

function validateKeywords(value: string | undefined): string | undefined {
  const keywords = parseKeywords(value ?? "");
  if (keywords.length === 0) return "Enter at least one keyword";
  return keywords.some((keyword) => keyword.length > MAX_KEYWORD_LENGTH)
    ? `Keep each keyword under ${MAX_KEYWORD_LENGTH} characters`
    : undefined;
}

export function AddKeywordsForm({ websiteId = "", onAdded, popAfterAdd = false }: AddKeywordsFormProps) {
  const { pop } = useNavigation();
  const { data: websites, isLoading, error, revalidate } = useWebsites();
  const loadFailed = Boolean(error) && !websites;
  const hasNoWebsites = websites?.length === 0;
  const { handleSubmit, itemProps, reset } = useForm<AddKeywordsValues>({
    initialValues: { websiteId, keywords: "" },
    validation: {
      websiteId: (value) => (value ? undefined : "Choose a website"),
      keywords: validateKeywords,
    },
    onSubmit: async (values) => {
      const keywords = parseKeywords(values.keywords);
      const website = await runWithToast(
        {
          pending: "Adding Keywords",
          success: "Keywords Added",
          failure: "Could Not Add Keywords",
          successMessage: (updatedWebsite) => addedKeywordsSummary(updatedWebsite, keywords),
        },
        () => api().addKeywords(values.websiteId, keywords),
      );
      if (!website) return false;
      onAdded?.();
      reset({ websiteId: values.websiteId, keywords: "" });
      if (popAfterAdd) pop();
      return true;
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {hasNoWebsites && <Action.OpenInBrowser title="Add a Website" url={`${APP_URL}/dashboard`} />}
          {loadFailed ? (
            <>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </>
          ) : (
            <Action.SubmitForm title="Add Keywords" icon={Icon.Plus} onSubmit={handleSubmit} />
          )}
          <Action.OpenInBrowser title="Open Keywords" url={`${APP_URL}/keywords`} />
          {!loadFailed && (
            <Action
              title="Reload Websites"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          )}
        </ActionPanel>
      }
    >
      {loadFailed && error && (
        <Form.Description
          title="Could Not Load Websites"
          text={`${error.message}\n\nRetry, or check your API key in the extension preferences.`}
        />
      )}
      {hasNoWebsites && (
        <Form.Description
          title="No Websites Yet"
          text="Add a website in RedReplier first, then reload to add keywords to it."
        />
      )}
      <Form.Dropdown title="Website" placeholder="Choose a website" {...itemProps.websiteId}>
        {websites?.map((website) => (
          <Form.Dropdown.Item key={website.id} value={website.id} title={websiteName(website)} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Keywords"
        placeholder={"social media scheduler\nbest buffer alternative"}
        info="One per line or separated by commas."
        {...itemProps.keywords}
      />
      <Form.Description text="Keywords over your plan's allowance wait as pending until you activate them in RedReplier." />
    </Form>
  );
}
