import { Action, ActionPanel, Color, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { EMAIL_STATUS } from "./utils/constants";
import { getEmails } from "./utils/api";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";
import { Email } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function Emails() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [cachedDomains] = useCachedState<string[]>("domains", []);

  type FormValues = {
    domain: string;
    status: string;
    limit: string;
  };

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      const { domain, status, limit } = values;
      const response = await getEmails(domain, status, Number(limit));
      if (!("errors" in response)) {
        await showToast({
          title: "Success",
          message: `Fetched ${response.data.length} email${response.data.length === 1 ? "" : "s"}`,
        });
        push(<EmailsList emails={response.data} domain={domain} status={status} />);
      } else {
        push(<ErrorComponent error={response.errors} />);
      }

      setIsLoading(false);
    },
    validation: {
      domain: FormValidation.Required,
      status: FormValidation.Required,
      limit(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
        else if (Number(value) < 1 || Number(value) > 100)
          return "The item must be a number between 1 and 100 (inclusive)";
      },
    },
    initialValues: {
      limit: "20",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Go To API Reference"
            url="https://mailwip.com/api/?javascript#fetch-aliases-http-response"
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" {...itemProps.domain}>
        <Form.Dropdown.Item title="All domains" value="all" />
        {cachedDomains.map((domain) => (
          <Form.Dropdown.Item key={domain} value={domain} title={domain} icon={getFavicon(`https://${domain}`)} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Status"
        info="can be sent, spam or outgoing. Default is sent to only include email that pass spam filter"
        {...itemProps.status}
      >
        {EMAIL_STATUS.map((status) => (
          <Form.Dropdown.Item key={status} title={status} value={status} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Limit"
        info="a number between 1 and 100 to limit how many emails are returned."
        {...itemProps.limit}
      />
    </Form>
  );
}

type EmailsListProps = {
  emails: Email[];
  domain: string;
  status: string;
};
function EmailsList({ emails, domain, status }: EmailsListProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  function getMarkdown(email: Email) {
    if (email.body)
      return `EMAIL BODY
---

${email.body}`;
    else
      return `EMAIL HTML BODY
---

${email.htmlbody}`;
  }

  const sectionTitle = `${domain === "all" ? "all domains" : domain} | ${emails.length} ${status} email${
    emails.length === 1 ? "" : "s"
  }`;
  function getStatusTintColor(status: string) {
    if (status === "sent") return Color.Green;
    else if (status === "outgoing") return Color.Blue;
    else return Color.Red;
  }

  return (
    <List isShowingDetail={isShowingDetail}>
      <List.Section title={sectionTitle}>
        {emails.map((email) => (
          <List.Item
            key={email.id}
            icon={{ source: Icon.Envelope, tintColor: getStatusTintColor(email.status) }}
            title={email.id.toString() + " | " + email.subject}
            accessories={[{ tag: new Date(email.created_at) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                />
                <Action.CopyToClipboard title="Copy ID to Clipboard" content={email.id} />
                <Action.CopyToClipboard title="Copy Email as JSON" content={JSON.stringify(email)} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={getMarkdown(email)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={email.id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Subject" text={email.subject} />
                    <List.Item.Detail.Metadata.Label title="From" text={email.from} />
                    <List.Item.Detail.Metadata.Label title="To" text={email.to.join("")} />
                    <List.Item.Detail.Metadata.Label title="Created At" text={email.created_at} />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={email.status}
                        color={getStatusTintColor(email.status)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Body"
                      icon={!email.body ? Icon.Minus : undefined}
                      text={email.body}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="HTML Body"
                      icon={!email.htmlbody ? Icon.Minus : undefined}
                      text={email.htmlbody}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
