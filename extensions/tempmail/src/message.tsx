<<<<<<< HEAD
import { NodeHtmlMarkdown } from "node-html-markdown";
=======
import TurndownService from "turndown";
import { parse } from "node-html-parser";
>>>>>>> contributions/merge-1701276408790659000
import { createHTMLFile, downloadAttachment, downloadMessage, getMessage } from "../lib/main";
import { useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  List,
  Icon,
  Detail,
  Color,
  showToast,
  Toast,
  Grid,
  environment,
  showInFinder,
  open,
} from "@raycast/api";
import moment from "moment";
<<<<<<< HEAD
import { Message } from "../lib/types";
=======
>>>>>>> contributions/merge-1701276408790659000

enum EmailViewMedium {
  MailApp,
  Browser,
  Finder,
}

<<<<<<< HEAD
function FullscreenDetails(data: Message): React.ReactNode {
=======
function FullscreenDetails(data): React.ReactNode {
>>>>>>> contributions/merge-1701276408790659000
  return (
    <List>
      <List.Section title="Received">
        <List.Item
          title={moment(data.createdAt).format("dddd, MMMM Do YYYY, h:mm:ss a")}
          accessories={[
            {
              tag: moment.duration(new Date(data.createdAt).getTime() - new Date().getTime()).humanize(true),
              icon: { source: Icon.Clock },
            },
            {
              tag: {
                value: `Auto deletes ${moment
                  .duration(new Date(data.retentionDate).getTime() - new Date().getTime())
                  .humanize(true)}`,
                color: Color.Red,
              },
              icon: { source: Icon.Trash },
            },
          ]}
        ></List.Item>
      </List.Section>
      <List.Section title="From">
        <List.Item
          title={data.from.address}
          subtitle={data.from.name}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Email"
                icon={{ source: Icon.Envelope }}
                content={data.from.address}
              ></Action.CopyToClipboard>
              {data.from.name && (
                <Action.CopyToClipboard
                  title="Copy Name"
                  icon={{ source: Icon.PersonCircle }}
                  content={data.from.name}
                ></Action.CopyToClipboard>
              )}
            </ActionPanel>
          }
        ></List.Item>
      </List.Section>
      {["to", "cc", "bcc"].map((recipientType) => (
        <List.Section key={recipientType} title={recipientType.charAt(0).toUpperCase() + recipientType.slice(1)}>
          {data[recipientType].map((recipient) => (
            <List.Item
              key={recipient.address}
              title={recipient.address}
              subtitle={recipient.name}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Email"
                    icon={{ source: Icon.Envelope }}
                    content={recipient.address}
                  ></Action.CopyToClipboard>
                  {recipient.name && (
                    <Action.CopyToClipboard
                      title="Copy Name"
                      icon={{ source: Icon.PersonCircle }}
                      content={recipient.name}
                    ></Action.CopyToClipboard>
                  )}
                </ActionPanel>
              }
            ></List.Item>
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function AttachmentItem({ attachment }) {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = useCachedPromise(downloadAttachment, [attachment], {
    abortable,
    onError: (e) => {
      if (e.message == "Token Expired") revalidate();
      else
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: e.message,
        });
    },
  });

  return (
    <Grid.Item
      title={isLoading ? "Loading file" : attachment.filename}
      content={
        data
          ? attachment.contentType.includes("image")
            ? { source: data }
            : { fileIcon: data }
          : { source: Icon.Document }
      }
      quickLook={data ? { path: data } : null}
      actions={
        <ActionPanel>
          {data && (
            <>
              <Action.ToggleQuickLook title="Preview Attachment"></Action.ToggleQuickLook>
              <Action.ShowInFinder title="View Attachment in Finder" path={data}></Action.ShowInFinder>
            </>
          )}
        </ActionPanel>
      }
    ></Grid.Item>
  );
}

function FullscreenAttachments(data): React.ReactNode {
  return (
    <Grid>
      {data.attachments.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment}></AttachmentItem>
      ))}
    </Grid>
  );
}

<<<<<<< HEAD
export default function MessageComponent({ id }: { id: string }): React.ReactNode {
  const [bodyMarkdown, updateBodyMarkdown] = useState<string>();

  const abortable = useRef<AbortController>();
  const {
    isLoading,
    data: message,
    revalidate,
  } = useCachedPromise(getMessage, [id], {
    abortable,
    keepPreviousData: true,
    onData: (data) => {
      updateBodyMarkdown(getMarkdown(data));
      if (data.attachments) {
        for (const attachment of data.attachments) {
          try {
            downloadAttachment(attachment);
          } catch (e) {
            showToast({
              style: Toast.Style.Failure,
              title: "Error downloading attachment",
              message: e.message,
            });
          }
=======
export default function Message({ id }) {
  const turndownService = new TurndownService({ headingStyle: "atx" });
  const [bodyMarkdown, updateBodyMarkdown] = useState<string>();

  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = useCachedPromise(getMessage, [id], {
    abortable,
    keepPreviousData: true,
    onData: (data) => {
      updateBodyMarkdown(getMarkdown(data?.html[0]));
      for (const attachment of data.attachments) {
        try {
          downloadAttachment(attachment);
        } catch (e) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error downloading attachment",
            message: e.message,
          });
>>>>>>> contributions/merge-1701276408790659000
        }
      }
    },
    onError: (e) => {
      if (e.message == "Token Expired") revalidate();
      else
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: e.message,
        });
    },
  });

  const downloadEmail = async (url: string, openIn: EmailViewMedium) => {
    try {
      const emailPath = await downloadMessage(url);

      if (openIn == EmailViewMedium.MailApp) open(emailPath as string);
      if (openIn == EmailViewMedium.Finder) showInFinder(emailPath as string);

      if (openIn == EmailViewMedium.Browser) {
        const htmlPath = await createHTMLFile(emailPath);
        open(htmlPath);
      }
    } catch (e) {
      if (e.message == "Token Expired") revalidate();
      else
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: e.message,
        });
    }
  };

<<<<<<< HEAD
  const getMarkdown = (new_data: Message) => {
    try {
      let html = new_data?.html[0];
      if (!html) throw new Error("No message body found");

      // remove table elements (they don't render properly in markdown)
      html = html.replace(/<table/g, "<div");
      html = html.replace(/<\/table>/g, "</div>");

      // convert html to markdown
      let bodyMarkdown = NodeHtmlMarkdown.translate(html, {
        keepDataImages: true,
      });
=======
  const getMarkdown = (html: string) => {
    try {
      const root = parse(html);
      const bodyHTML = root.querySelector("body").toString();

      let bodyMarkdown = `# **${data?.subject ?? ""}**\n---\n&nbsp;&nbsp;${turndownService.turndown(bodyHTML ?? html)}`;
>>>>>>> contributions/merge-1701276408790659000

      // replace inline attachments with images
      const regex = /(attachment:ATTACH\d{1,6})/g;
      bodyMarkdown = bodyMarkdown.replace(regex, (match, attachmentString) => {
        // attachmentString will contain the entire "attachment:ATTACH" substring along with the number
        const attachmentID = attachmentString.substring(11);
<<<<<<< HEAD
        const attachment = new_data.attachments.find((attch) => attch.id == attachmentID);
=======
        const attachment = data.attachments.find((attch) => attch.id == attachmentID);
>>>>>>> contributions/merge-1701276408790659000

        return `${environment.supportPath}/temp/attachments/${attachment.id}_${attachment.filename}`.replace(
          " ",
          "%20"
        );
      });

<<<<<<< HEAD
      const header = new_data?.subject ? `# **${new_data.subject}**\n---\n\n` : "";
      bodyMarkdown = header + bodyMarkdown;

=======
>>>>>>> contributions/merge-1701276408790659000
      return bodyMarkdown;
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't read message",
        message: e.message,
      });
      return null;
    }
  };

  return (
    <List isShowingDetail filtering={false} isLoading={isLoading}>
      {isLoading && (
        <List.Item
          icon={{ source: Icon.CircleProgress }}
          title="Loading Message"
          subtitle="Retrieving message from server"
        />
      )}
<<<<<<< HEAD
      {!isLoading && !message && (
=======
      {!isLoading && !data && (
>>>>>>> contributions/merge-1701276408790659000
        <List.Item
          icon={{ source: Icon.ExclamationMark }}
          title="Couldn't fetch messages"
          subtitle="Failed to retrieve messages from server"
        />
      )}
<<<<<<< HEAD
      {!isLoading && message && (
=======
      {!isLoading && data && (
>>>>>>> contributions/merge-1701276408790659000
        <>
          <List.Item
            title="Email"
            detail={
              <List.Item.Detail
                markdown={
                  bodyMarkdown ??
                  "# ❗ **Error Reading Email** ❗\n---\nTry viewing the message externally by pressing `⏎`"
                }
              />
            }
            actions={
              <ActionPanel>
                {bodyMarkdown && (
                  <Action.Push title="View Fullscreen" target={<Detail markdown={bodyMarkdown}></Detail>}></Action.Push>
                )}
                <ActionPanel.Submenu title="View Email Externally" icon={{ source: Icon.Upload }}>
                  <Action
                    title="Mail App"
                    icon={{ source: Icon.AppWindow }}
<<<<<<< HEAD
                    onAction={() => downloadEmail(message.downloadUrl, EmailViewMedium.MailApp)}
=======
                    onAction={() => downloadEmail(data.downloadUrl, EmailViewMedium.MailApp)}
>>>>>>> contributions/merge-1701276408790659000
                  />
                  <Action
                    title="Browser"
                    icon={{ source: Icon.Globe }}
<<<<<<< HEAD
                    onAction={() => downloadEmail(message.downloadUrl, EmailViewMedium.Browser)}
=======
                    onAction={() => downloadEmail(data.downloadUrl, EmailViewMedium.Browser)}
>>>>>>> contributions/merge-1701276408790659000
                  />
                  <Action
                    title="Download Email"
                    icon={{ source: Icon.Download }}
<<<<<<< HEAD
                    onAction={() => downloadEmail(message.downloadUrl, EmailViewMedium.Finder)}
=======
                    onAction={() => downloadEmail(data.downloadUrl, EmailViewMedium.Finder)}
>>>>>>> contributions/merge-1701276408790659000
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
            accessories={[
              {
<<<<<<< HEAD
                tag: { value: message.subject, color: Color.Blue },
=======
                tag: { value: data.subject, color: Color.Blue },
>>>>>>> contributions/merge-1701276408790659000
                icon: { source: Icon.BullsEye },
                tooltip: "Subject",
              },
            ]}
          />
          <List.Item
            title="Details"
            accessories={[
              {
<<<<<<< HEAD
                text: moment.duration(new Date(message.createdAt).getTime() - new Date().getTime()).humanize(true),
=======
                text: moment.duration(new Date(data.createdAt).getTime() - new Date().getTime()).humanize(true),
>>>>>>> contributions/merge-1701276408790659000
                tooltip: "From",
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
<<<<<<< HEAD
                    <List.Item.Detail.Metadata.Label
                      title="From"
                      text={`${message.from.name} <${message.from.address}>`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {message.to.map((to, i) => (
=======
                    <List.Item.Detail.Metadata.Label title="From" text={`${data.from.name} <${data.from.address}>`} />
                    <List.Item.Detail.Metadata.Separator />
                    {data.to.map((to, i) => (
>>>>>>> contributions/merge-1701276408790659000
                      <List.Item.Detail.Metadata.Label
                        key={to.address}
                        title={i == 0 ? "To" : ""}
                        text={`${to.name} <${to.address}>`}
                      />
                    ))}
<<<<<<< HEAD
                    {message.cc.length != 0 && <List.Item.Detail.Metadata.Separator />}
                    {message.cc.map((cc, i) => (
=======
                    {data.cc.length != 0 && <List.Item.Detail.Metadata.Separator />}
                    {data.cc.map((cc, i) => (
>>>>>>> contributions/merge-1701276408790659000
                      <List.Item.Detail.Metadata.Label
                        key={cc.address}
                        title={i == 0 ? "Cc" : ""}
                        text={`${cc.name} <${cc.address}>`}
                      />
                    ))}
<<<<<<< HEAD
                    {message.bcc.length != 0 && <List.Item.Detail.Metadata.Separator />}
                    {message.bcc.map((bcc, i) => (
=======
                    {data.bcc.length != 0 && <List.Item.Detail.Metadata.Separator />}
                    {data.bcc.map((bcc, i) => (
>>>>>>> contributions/merge-1701276408790659000
                      <List.Item.Detail.Metadata.Label
                        key={bcc.address}
                        title={i == 0 ? "Bcc" : ""}
                        text={`${bcc.name} <${bcc.address}>`}
                      />
                    ))}
                    <List.Item.Detail.Metadata.Label title="" />
                    <List.Item.Detail.Metadata.Label
                      title="Received"
<<<<<<< HEAD
                      text={moment(message.createdAt).format("dddd, MMMM Do YYYY, h:mm:ss a")}
=======
                      text={moment(data.createdAt).format("dddd, MMMM Do YYYY, h:mm:ss a")}
>>>>>>> contributions/merge-1701276408790659000
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Auto deletes"
                      text={moment
<<<<<<< HEAD
                        .duration(new Date(message.retentionDate).getTime() - new Date().getTime())
=======
                        .duration(new Date(data.retentionDate).getTime() - new Date().getTime())
>>>>>>> contributions/merge-1701276408790659000
                        .humanize(true)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
<<<<<<< HEAD
                <Action.Push title="View Fullscreen" target={FullscreenDetails(message)}></Action.Push>
              </ActionPanel>
            }
          />
          {message.hasAttachments && (
            <List.Item
              title="Attachments"
              accessories={[{ tag: { value: message.attachments.length.toString() }, icon: Icon.Paperclip }]}
=======
                <Action.Push title="View Fullscreen" target={FullscreenDetails(data)}></Action.Push>
              </ActionPanel>
            }
          />
          {data.hasAttachments && (
            <List.Item
              title="Attachments"
              accessories={[{ tag: { value: data.attachments.length.toString() }, icon: Icon.Paperclip }]}
>>>>>>> contributions/merge-1701276408790659000
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
<<<<<<< HEAD
                      {message.attachments.map((attachment) => (
=======
                      {data.attachments.map((attachment, i) => (
>>>>>>> contributions/merge-1701276408790659000
                        <List.Item.Detail.Metadata.TagList key={attachment.id} title={attachment.filename}>
                          <List.Item.Detail.Metadata.TagList.Item
                            text={attachment.contentType}
                            icon={{ source: Icon.Tag }}
                            color={Color.Green}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
<<<<<<< HEAD
                  <Action.Push title="View Fullscreen" target={FullscreenAttachments(message)}></Action.Push>
=======
                  <Action.Push title="View Fullscreen" target={FullscreenAttachments(data)}></Action.Push>
>>>>>>> contributions/merge-1701276408790659000
                </ActionPanel>
              }
            ></List.Item>
          )}
        </>
      )}
    </List>
  );
}
