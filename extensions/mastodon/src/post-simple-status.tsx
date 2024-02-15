import { useEffect } from "react";
import { Form, ActionPanel, Action, Icon, getPreferenceValues, LaunchProps } from "@raycast/api";

import { Status, StatusRequest } from "./utils/types";
import { useSubmitStatus } from "./hooks/usePostStatus";
import { useMe } from "./hooks/useMe";

import VisibilityDropdown from "./components/VisibilityDropdown";
import { contentExtractor } from "./utils/helpers";

const { instance, enableMarkdown }: Preferences = getPreferenceValues();

export interface LaunchContext {
  status: Status;
  action: "post" | "edit" | "reply";
}

export interface CommandProps extends LaunchProps {
  children?: React.ReactNode;
  draftValues: Partial<StatusRequest>;
  launchContext: LaunchContext;
}

export default function SimpleCommand({ children, draftValues, launchContext }: CommandProps) {
  const { handleSubmit, latestStatus, openActionText, itemProps, focus } = useSubmitStatus(draftValues, launchContext);

  const { username, getUsername, isLoading } = useMe();

  useEffect(() => {
    getUsername();
    itemProps.sensitive.value ? focus("spoiler_text") : focus("status");
  }, [itemProps.sensitive.value]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={"Toot"} icon={Icon.Upload} />
          {latestStatus && <Action.OpenInBrowser url={latestStatus.url} title={openActionText} />}
          {instance && <Action.OpenInBrowser url={`https://${instance}/home`} title="Open Mastodon in Browser" />}
        </ActionPanel>
      }
    >
      {launchContext?.action === "reply" && (
        <Form.Description
          title={`Reply To ${launchContext.status.account.acct}`}
          text={contentExtractor(launchContext.status.content)}
        />
      )}
      <Form.Description title="Account" text={`${username}@${instance}`} />
      {itemProps.sensitive.value && (
        <Form.TextField title="CW" placeholder={"content warning"} {...itemProps.spoiler_text} />
      )}
      {launchContext?.action === "edit" ? (
        <Form.TextArea
          id="status"
          title="Content"
          placeholder={`Write something down ${itemProps.isMarkdown.value ? "with Markdown" : ""}`}
          enableMarkdown={itemProps.isMarkdown.value}
          defaultValue={contentExtractor(launchContext.status.content) ?? null}
          autoFocus
        />
      ) : (
        <Form.TextArea
          title="Content"
          placeholder={`Write something down ${itemProps.isMarkdown.value ? "with Markdown" : ""}`}
          enableMarkdown={itemProps.isMarkdown.value}
          autoFocus
          {...itemProps.status}
        />
      )}
      {!children && !launchContext?.status && <VisibilityDropdown />}
      {children}
      {enableMarkdown && <Form.Checkbox label="Markdown" storeValue {...itemProps.isMarkdown} />}
      <Form.Checkbox label="Sensitive" {...itemProps.sensitive} storeValue />
    </Form>
  );
}
