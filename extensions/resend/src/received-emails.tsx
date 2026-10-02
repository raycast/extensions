import { Action, ActionPanel, Detail, Icon, List, open } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getResend, withResend } from "./lib/oauth";
import ErrorComponent from "./components/ErrorComponent";

export default withResend(ReceivedEmails);

function ReceivedEmails() {
  const {
    data: emails,
    isLoading,
    error,
    pagination,
    revalidate,
  } = useCachedPromise(
    () => async (options) => {
      const response = await getResend().emails.receiving.list({ after: options.lastItem?.id });
      if (response.error) throw new Error(response.error.message);

      return {
        data: response.data.data,
        hasMore: response.data.has_more,
      };
    },
    [],
    {
      initialData: [],
      onError: async (error) => {
        await showFailureToast(error, { title: "Could Not Load Received Emails" });
      },
    },
  );

  if (error) return <ErrorComponent error={error} />;

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search received email">
      {!isLoading && emails.length === 0 ? (
        <List.EmptyView
          icon={Icon.Envelope}
          title="No Received Emails"
          description="Emails sent to a receiving-enabled Resend domain will appear here."
          actions={
            <ActionPanel>
              <Action title="Reload Received Emails" icon={Icon.Redo} onAction={revalidate} />
              <Action.OpenInBrowser
                title="Learn About Receiving Email"
                url="https://resend.com/docs/dashboard/receiving/introduction"
              />
            </ActionPanel>
          }
        />
      ) : (
        emails.map((email) => (
          <List.Item
            key={email.id}
            icon={Icon.Envelope}
            title={email.from}
            subtitle={email.subject || "(No Subject)"}
            accessories={[
              ...(email.attachments.length > 0 ? [{ icon: Icon.Paperclip, text: `${email.attachments.length}` }] : []),
              { date: new Date(email.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Read Email" icon={Icon.Eye} target={<ReceivedEmailDetail emailId={email.id} />} />
                <Action.CopyToClipboard title="Copy Sender Address" content={email.from} />
                <Action.CopyToClipboard title="Copy Email ID" content={email.id} />
                <Action title="Reload Received Emails" icon={Icon.Redo} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ReceivedEmailDetail({ emailId }: { emailId: string }) {
  const {
    data: email,
    isLoading,
    error,
  } = useCachedPromise(
    async (id: string) => {
      const response = await getResend().emails.receiving.get(id);
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    [emailId],
    {
      onError: async (error) => {
        await showFailureToast(error, { title: "Could Not Load Received Email" });
      },
    },
  );

  if (error) return <ErrorComponent error={error} />;

  async function openAttachment(attachmentId: string) {
    try {
      const response = await getResend().emails.receiving.attachments.get({ emailId, id: attachmentId });
      if (response.error) throw new Error(response.error.message);
      await open(response.data.download_url);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Open Attachment" });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={email?.subject || "Received Email"}
      markdown={email?.html || email?.text || "_This email has no body._"}
      metadata={
        email && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="From" text={email.from} />
            <Detail.Metadata.Label title="To" text={email.to.join(", ")} />
            <Detail.Metadata.Label title="Subject" text={email.subject || "(No Subject)"} />
            <Detail.Metadata.Label title="Received" text={new Date(email.created_at).toLocaleString()} />
            {email.cc?.length ? <Detail.Metadata.Label title="CC" text={email.cc.join(", ")} /> : null}
            {email.reply_to?.length ? (
              <Detail.Metadata.Label title="Reply To" text={email.reply_to.join(", ")} />
            ) : null}
            {email.attachments.map((attachment) => (
              <Detail.Metadata.Label
                key={attachment.id}
                title="Attachment"
                text={`${attachment.filename || "Unnamed attachment"} (${formatBytes(attachment.size)})`}
                icon={Icon.Paperclip}
              />
            ))}
          </Detail.Metadata>
        )
      }
      actions={
        email && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Sender Address" content={email.from} />
            <Action.CopyToClipboard title="Copy Email ID" content={email.id} />
            {email.attachments.length > 0 && (
              <ActionPanel.Section title="Attachments">
                {email.attachments.map((attachment) => (
                  <Action
                    key={attachment.id}
                    title={`Open ${attachment.filename || "Attachment"}`}
                    icon={Icon.Download}
                    onAction={() => openAttachment(attachment.id)}
                  />
                ))}
              </ActionPanel.Section>
            )}
          </ActionPanel>
        )
      }
    />
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
