import { FormValidation, useForm } from "@raycast/utils";
import { SendEmailRequestForm } from "./utils/types";
import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { isApiError } from "./utils/api";
import { RESEND_URL } from "./utils/constants";
import fs from "fs";
import path from "path";
import ErrorComponent from "./components/ErrorComponent";
import { onError, useEmails, useGetEmail } from "./lib/hooks";
import { resend } from "./lib/resend";
import { Attachment, CreateEmailOptions, Tag as EmailTag } from "resend";

// Get preferences for sender information
const preferences = getPreferenceValues<ExtensionPreferences>();

// Create default sender string from preferences
const defaultSender = `${preferences.sender_name} <${preferences.sender_email}>`;

export default function Emails() {
  const { isLoading, emails, error, pagination, mutate } = useEmails();

  const getTintColor = (last_event: string) => {
    if (last_event === "delivered") return Color.Green;
    else if (last_event === "sent") return Color.Blue;
    else if (last_event === "bounced") return Color.Yellow;
    else if (last_event === "complained") return Color.Red;
    else return undefined;
  };

  return error && isApiError(error) ? (
    <ErrorComponent error={error.message} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search email" pagination={pagination}>
      {emails.length === 0 ? (
        <List.EmptyView
          title="No emails yet"
          description="Start sending emails to see insights and previews for every message."
          actions={
            <ActionPanel>
              <Action.Push
                title="Send New Email"
                shortcut={Keyboard.Shortcut.Common.New}
                icon={Icon.Envelope}
                target={<EmailSend onEmailSent={mutate} />}
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
              title={email.to[0]}
              subtitle={email.subject}
              accessories={[{ date: new Date(email.created_at) }]}
              key={email.id}
              icon={{ source: Icon.Envelope, tintColor: getTintColor(email.last_event) }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy ID To Clipboard" content={email.id} />
                  <Action.Push icon={Icon.Eye} title="View Email" target={<ViewEmail id={email.id} />} />
                  <Action.OpenInBrowser
                    title="Open Email In Resend Dashboard"
                    url={`${RESEND_URL}emails/${email.id}`}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Send New Email"
                      shortcut={Keyboard.Shortcut.Common.New}
                      icon={Icon.Envelope}
                      target={<EmailSend onEmailSent={mutate} />}
                    />
                    <Action.OpenInBrowser
                      title="View API Reference"
                      url={`${RESEND_URL}docs/api-reference/emails/retrieve-email`}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}

function ViewEmail({ id }: { id: string }) {
  const { isLoading, email } = useGetEmail(id);
  return (
    <Detail
      isLoading={isLoading}
      markdown={email?.html || email?.text}
      metadata={
        email && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={email.id} />
            <Detail.Metadata.Label title="To" text={email.to.join()} />
            <Detail.Metadata.Label title="From" text={email.from} />
            <Detail.Metadata.Label title="Created At" text={email.created_at} />
            <Detail.Metadata.Label title="Subject" text={email.subject} />
            <Detail.Metadata.Label
              title="BCC"
              text={email.bcc ? email.bcc.join() : undefined}
              icon={!email.bcc ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="CC"
              text={email.cc ? email.cc.join() : undefined}
              icon={!email.cc ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Reply To"
              text={email.reply_to ? email.reply_to.join() : undefined}
              icon={!email.reply_to ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label title="Last Event" text={email.last_event} />
          </Detail.Metadata>
        )
      }
    />
  );
}

type EmailSendProps = {
  onEmailSent: () => void;
};
function EmailSend({ onEmailSent }: EmailSendProps) {
  const { pop } = useNavigation();

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
      try {
        const toast = await showToast(Toast.Style.Animated, "Sending Email");
        const { from, subject, reply_to, html, text } = values;
        const to = values.to.split(",").map((item) => item.trim());
        const bcc = values.bcc && values.bcc.split(",").map((item) => item.trim());
        const cc = values.cc && values.cc.split(",").map((item) => item.trim());

        const attachments: Attachment[] = [];
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

        const newEmail: CreateEmailOptions = {
          from,
          to,
          subject,
          bcc,
          cc,
          replyTo: reply_to,
          html,
          text,
          attachments,
          tags,
          react: undefined,
        };
        if (!attachments.length) delete newEmail.attachments;
        const { data, error } = await resend.emails.send(newEmail);
        if (error) throw new Error(error.message, { cause: error.name });
        toast.style = Toast.Style.Success;
        toast.title = "Sent Email";
        toast.message = data.id;
        onEmailSent();
        pop();
      } catch (error) {
        onError(error as Error);
      }
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
