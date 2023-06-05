import TurndownService from "turndown";
import { parse } from "node-html-parser";
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

enum EmailViewMedium {
  MailApp,
  Browser,
  Finder,
}

function FullscreenDetails(data): React.ReactNode {
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

  const getMarkdown = (html: string) => {
    try {
      const root = parse(html);
      const bodyHTML = root.querySelector("body").toString();

      let bodyMarkdown = `# **${data?.subject ?? ""}**\n---\n&nbsp;&nbsp;${turndownService.turndown(bodyHTML ?? html)}`;

      // replace inline attachments with images
      const regex = /(attachment:ATTACH\d{1,6})/g;
      bodyMarkdown = bodyMarkdown.replace(regex, (match, attachmentString) => {
        // attachmentString will contain the entire "attachment:ATTACH" substring along with the number
        const attachmentID = attachmentString.substring(11);
        const attachment = data.attachments.find((attch) => attch.id == attachmentID);

        return `${environment.supportPath}/temp/attachments/${attachment.id}_${attachment.filename}`.replace(
          " ",
          "%20"
        );
      });

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
      {!isLoading && !data && (
        <List.Item
          icon={{ source: Icon.ExclamationMark }}
          title="Couldn't fetch messages"
          subtitle="Failed to retrieve messages from server"
        />
      )}
      {!isLoading && data && (
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
                    onAction={() => downloadEmail(data.downloadUrl, EmailViewMedium.MailApp)}
                  />
                  <Action
                    title="Browser"
                    icon={{ source: Icon.Globe }}
                    onAction={() => downloadEmail(data.downloadUrl, EmailViewMedium.Browser)}
                  />
                  <Action
                    title="Download Email"
                    icon={{ source: Icon.Download }}
                    onAction={() => downloadEmail(data.downloadUrl, EmailViewMedium.Finder)}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
            accessories={[
              {
                tag: { value: data.subject, color: Color.Blue },
                icon: { source: Icon.BullsEye },
                tooltip: "Subject",
              },
            ]}
          />
          <List.Item
            title="Details"
            accessories={[
              {
                text: moment.duration(new Date(data.createdAt).getTime() - new Date().getTime()).humanize(true),
                tooltip: "From",
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="From" text={`${data.from.name} <${data.from.address}>`} />
                    <List.Item.Detail.Metadata.Separator />
                    {data.to.map((to, i) => (
                      <List.Item.Detail.Metadata.Label
                        key={to.address}
                        title={i == 0 ? "To" : ""}
                        text={`${to.name} <${to.address}>`}
                      />
                    ))}
                    {data.cc.length != 0 && <List.Item.Detail.Metadata.Separator />}
                    {data.cc.map((cc, i) => (
                      <List.Item.Detail.Metadata.Label
                        key={cc.address}
                        title={i == 0 ? "Cc" : ""}
                        text={`${cc.name} <${cc.address}>`}
                      />
                    ))}
                    {data.bcc.length != 0 && <List.Item.Detail.Metadata.Separator />}
                    {data.bcc.map((bcc, i) => (
                      <List.Item.Detail.Metadata.Label
                        key={bcc.address}
                        title={i == 0 ? "Bcc" : ""}
                        text={`${bcc.name} <${bcc.address}>`}
                      />
                    ))}
                    <List.Item.Detail.Metadata.Label title="" />
                    <List.Item.Detail.Metadata.Label
                      title="Received"
                      text={moment(data.createdAt).format("dddd, MMMM Do YYYY, h:mm:ss a")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Auto deletes"
                      text={moment
                        .duration(new Date(data.retentionDate).getTime() - new Date().getTime())
                        .humanize(true)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View Fullscreen" target={FullscreenDetails(data)}></Action.Push>
              </ActionPanel>
            }
          />
          {data.hasAttachments && (
            <List.Item
              title="Attachments"
              accessories={[{ tag: { value: data.attachments.length.toString() }, icon: Icon.Paperclip }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {data.attachments.map((attachment, i) => (
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
                  <Action.Push title="View Fullscreen" target={FullscreenAttachments(data)}></Action.Push>
                </ActionPanel>
              }
            ></List.Item>
          )}
        </>
      )}
    </List>
  );
}
