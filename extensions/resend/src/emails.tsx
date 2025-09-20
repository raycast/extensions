import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { EmailAttachment, EmailTag, GetEmailResponse, SendEmailRequest, SendEmailRequestForm } from "./utils/types";
import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getApiKeys, getEmail, sendEmail } from "./utils/api";
import { RESEND_URL } from "./utils/constants";
import fs from "fs";
import path from "path";
import ErrorComponent from "./components/ErrorComponent";

// Get preferences for sender information
const preferences = getPreferenceValues<ExtensionPreferences>();

// Create default sender string from preferences
const defaultSender = `${preferences.sender_name} <${preferences.sender_email}>`;

export default function Emails() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  type LoggedEmail = GetEmailResponse & { logged_at: Date; retrieved_at: Date };
  const [emails, setEmails] = useCachedState<LoggedEmail[]>("emails", []);
  const [error, setError] = useState("");

  async function getNewEmail(id: string) {
    setIsLoading(true);
    const response = await getEmail(id);
    if (!("statusCode" in response)) {
      showToast(Toast.Style.Success, "Fetched Email", response.id);
      setEmails([...emails, { ...response, logged_at: new Date(), retrieved_at: new Date() }]);
    }
    setIsLoading(false);
  }

  const getTintColor = (last_event: string) => {
    if (last_event === "delivered") return Color.Green;
    else if (last_event === "sent") return Color.Blue;
    else if (last_event === "bounced") return Color.Yellow;
    else if (last_event === "complained") return Color.Red;
    else return undefined;
  };

  async function retrieveEmailAgain(id: string) {
    setIsLoading(true);
    const response = await getEmail(id);
    if (!("statusCode" in response)) {
      showToast(Toast.Style.Success, "Retrieved Email", response.id);
      const newEmails = emails;
      const index = newEmails.findIndex((email) => email.id === id);
      newEmails[index] = { ...response, logged_at: newEmails[index].logged_at, retrieved_at: new Date() };
    }
    setIsLoading(false);
  }
  async function confirmAndRemove(email: LoggedEmail) {
    if (
      await confirmAlert({
        title: `Remove '${email.subject}' From Log?`,
        message: `This will NOT remove the email from your Resend Dashboard.`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const newEmails = emails;
      const index = newEmails.findIndex((newEmail) => newEmail.id === email.id);
      newEmails.splice(index, 1);
      setEmails([...newEmails]);
      setIsLoading(false);
    }
  }

  async function getAPIKeysFromApi() {
    const response = await getApiKeys();
    if ("name" in response) {
      if (response.name === "validation_error" || response.name === "restricted_api_key") {
        setError(response.message);
      }
    }
    setIsLoading(false);
  }

  useEffect(() => {
    // this function is called to determine if the set API Key is valid and has permissions
    getAPIKeysFromApi();
  }, []);

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search email" isShowingDetail={emails.length > 0}>
      {emails.length === 0 ? (
        <List.EmptyView
          title="No emails found."
          description="Send an email to begin logging sent emails."
          actions={
            <ActionPanel>
              <Action
                title="Send New Email"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                icon={Icon.Envelope}
                onAction={() => push(<EmailSend onEmailSent={getNewEmail} />)}
              />
              <Action.OpenInBrowser
                title="View API Reference"
                url={`${RESEND_URL}docs/api-reference/emails/send-email`}
              />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading &&
        emails
          .sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf())
          .map((email) => (
            <List.Item
              title={email.subject}
              accessories={[{ tag: new Date(email.created_at) }]}
              key={email.id}
              icon={{ source: Icon.Envelope, tintColor: getTintColor(email.last_event) }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy ID To Clipbard" content={email.id} />
                  <Action title="Retrieve Email Again" icon={Icon.Redo} onAction={() => retrieveEmailAgain(email.id)} />
                  <Action
                    title="Remove Email From Log"
                    icon={Icon.Eraser}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    style={Action.Style.Destructive}
                    onAction={() => confirmAndRemove(email)}
                  />
                  <Action.OpenInBrowser
                    title="Open Email In Resend Dashboard"
                    url={`${RESEND_URL}emails/${email.id}`}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Send New Email"
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      icon={Icon.Envelope}
                      onAction={() => push(<EmailSend onEmailSent={getNewEmail} />)}
                    />
                    <Action.OpenInBrowser
                      title="View API Reference"
                      url={`${RESEND_URL}docs/api-reference/emails/retrieve-email`}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={email.html || email.text}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="ID" text={email.id} />
                      <List.Item.Detail.Metadata.Label title="To" text={email.to.join()} />
                      <List.Item.Detail.Metadata.Label title="From" text={email.from} />
                      <List.Item.Detail.Metadata.Label title="Created At" text={email.created_at} />
                      <List.Item.Detail.Metadata.Label title="Subject" text={email.subject} />
                      <List.Item.Detail.Metadata.Label
                        title="BCC"
                        text={email.bcc ? email.bcc.join() : undefined}
                        icon={!email.bcc ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="CC"
                        text={email.cc ? email.cc.join() : undefined}
                        icon={!email.cc ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Reply To"
                        text={email.reply_to ? email.reply_to.join() : undefined}
                        icon={!email.reply_to ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label title="Last Event" text={email.last_event} />
                      <List.Item.Detail.Metadata.Label
                        title="Logged At"
                        text={email.logged_at?.toDateString() || "-"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Retrieved At"
                        text={email.retrieved_at?.toDateString() || "-"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))
      )}
    </List>
  );
}

type EmailSendProps = {
  onEmailSent: (id: string) => void;
};
function EmailSend({ onEmailSent }: EmailSendProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [attachmentType, setAttachmentType] = useState("FilePicker");
  const [hostedAttachmentUrl, sethostedAttachmentUrl] = useState("");
  type Tag = EmailTag & { nameError: string; valueError: string };
  const [emailTags, setEmailTags] = useState<Tag[]>([]);

  function addTag() {
    setEmailTags([...emailTags, { name: "", value: "", nameError: "", valueError: "" }]);
  }
  function removeTag() {
    if (emailTags.length !== 0) setEmailTags(emailTags.slice(0, -1));
  }

  const { handleSubmit, itemProps } = useForm<SendEmailRequestForm>({
    async onSubmit(values) {
      setIsLoading(true);

      const { from, subject, reply_to, html, text } = values;
      const to = values.to.split(",").map((item) => item.trim());
      const bcc = values.bcc && values.bcc.split(",").map((item) => item.trim());
      const cc = values.cc && values.cc.split(",").map((item) => item.trim());

      const attachments: EmailAttachment[] = [];
      if (attachmentType === "Hosted") {
        const filename = path.basename(hostedAttachmentUrl);
        attachments.push({ filename, path: hostedAttachmentUrl });
      } else {
        const files = values.attachments?.filter((file) => fs.existsSync(file) && fs.lstatSync(file).isFile());
        if (files) {
          for (const file of files) {
            const content = fs.readFileSync(file);
            const filename = path.basename(file);
            attachments.push({ filename, content });
          }
        }
      }

      const tags: EmailTag[] = emailTags.map((tag) => {
        return { name: tag.name, value: tag.value };
      });

      const newEmail: SendEmailRequest = { from, to, subject, bcc, cc, reply_to, html, text, attachments, tags };
      if (!attachments.length) delete newEmail.attachments;
      const response = await sendEmail(newEmail);
      if (!("statusCode" in response)) {
        showToast(Toast.Style.Success, "Sent Email", response.id);
        pop();
        onEmailSent(response.id);
      }
      setIsLoading(false);
    },
    validation: {
      from: FormValidation.Required,
      to: FormValidation.Required,
      subject: FormValidation.Required,
      html(value) {
        if (!itemProps.text.value && !value) return "The item is required";
      },
    },
    initialValues: {
      from: defaultSender,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
          <Action title="Add Tag" icon={Icon.Plus} onAction={addTag} shortcut={{ modifiers: ["cmd"], key: "t" }} />
          {emailTags.length > 0 && (
            <Action
              title="Remove Tag"
              icon={Icon.Minus}
              onAction={removeTag}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          )}
          <Action.OpenInBrowser title="View API Reference" url={`${RESEND_URL}docs/api-reference/emails/send-email`} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="From"
        placeholder="Your Name <sender@domain.com>"
        info="Sender email address. Default is set from your preferences."
        {...itemProps.from}
      />
      <Form.TextArea
        title="To"
        placeholder="recipient@example.com"
        info="Recipient email address. For multiple addresses, send as an array of strings. Max 50."
        {...itemProps.to}
      />
      <Form.TextField
        title="Subject"
        placeholder="Raycast Extension for Resend"
        info="Email subject."
        {...itemProps.subject}
      />

      <Form.Separator />
      <Form.TextField
        title="BCC"
        placeholder="boss@example.com"
        info="Bcc recipient email address. For multiple addresses, send as an array of strings."
        {...itemProps.bcc}
      />
      <Form.TextField
        title="CC"
        placeholder="colleague@example.com"
        info="Cc recipient email address. For multiple addresses, send as an array of strings."
        {...itemProps.cc}
      />
      <Form.TextField
        title="Reply To"
        placeholder="dev@domain.com,design@domain.com"
        info="Reply-to email address. For multiple addresses, send as an array of strings."
        {...itemProps.reply_to}
      />
      <Form.TextArea
        title="HTML Message"
        placeholder="<p>Hey! There's a cool new Raycast Extension for Resend!</p>"
        info="The HTML version of the message."
        {...itemProps.html}
      />
      <Form.TextArea
        title="Text Message"
        placeholder="Hey! There's a cool new Raycast Extension for Resend!"
        info="The plain text version of the message."
        {...itemProps.text}
      />

      <Form.Separator />
      <Form.Description text="Attachments" />
      <Form.Dropdown title="Attachment Type" id="attachmentType" onChange={setAttachmentType}>
        <Form.Dropdown.Item title="FilePicker" value="FilePicker" />
        <Form.Dropdown.Item title="Hosted" value="Hosted" />
      </Form.Dropdown>
      {attachmentType === "FilePicker" && (
        <Form.FilePicker
          title="Attachments"
          info="Filename and content of attachments (max 40mb per email)"
          {...itemProps.attachments}
        />
      )}
      {attachmentType === "Hosted" && (
        <Form.TextField
          id="hostedAttachmentUrl"
          placeholder="https://www.raycast.com/favicon-production.png"
          title="Attachment URL"
          info="Path where the attachment file is hosted."
          onChange={sethostedAttachmentUrl}
        />
      )}

      <Form.Separator />
      <Form.Description title="Tags" text="Press 'cmd+T' to add a Tag" />
      {emailTags.length > 0 && <Form.Description text="Press 'cmd+shift+T' to remove a Tag" />}
      {emailTags.map((tag, tagIndex) => (
        <React.Fragment key={tagIndex}>
          <Form.TextField
            key={`name_${tagIndex}`}
            onChange={(newName) => {
              const newTags = emailTags;
              newTags[tagIndex].name = newName;
              setEmailTags([...newTags]);
            }}
            id={`name_${tagIndex}`}
            placeholder={`Tag # ${tagIndex + 1}`}
            title={`Tag ${tagIndex + 1} Name`}
            error={tag.nameError}
            onBlur={(event) => {
              const tags = emailTags;
              if (event.target.value?.length === 0) tags[tagIndex].nameError = "The item is required";
              else tags[tagIndex].nameError = "";
              setEmailTags([...tags]);
            }}
          />
          <Form.TextField
            key={`value_${tagIndex}`}
            onChange={(newValue) => {
              const newTags = emailTags;
              newTags[tagIndex].value = newValue;
              setEmailTags([...newTags]);
            }}
            id={`value_${tagIndex}`}
            placeholder={`Value # ${tagIndex + 1}`}
            title={`Tag ${tagIndex + 1} Value`}
            error={tag.valueError}
            onBlur={(event) => {
              const tags = emailTags;
              if (event.target.value?.length === 0) tags[tagIndex].valueError = "The item is required";
              else tags[tagIndex].valueError = "";
              setEmailTags([...tags]);
            }}
          />
        </React.Fragment>
      ))}
    </Form>
  );
}
