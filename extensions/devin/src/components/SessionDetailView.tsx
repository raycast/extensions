import { Action, ActionPanel, Detail, Icon, Toast, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { buildSessionMarkdown } from "../lib/format";
import { getDevinClient } from "../lib/devin";
import { SessionDetail, SessionSummary } from "../types";
import { SendMessageForm } from "./SendMessageForm";

type Props = {
  session: SessionSummary;
  onOpened?: () => Promise<void> | void;
  onSent?: () => Promise<void> | void;
};

export function SessionDetailView({ session, onOpened, onSent }: Props) {
  const client = getDevinClient();
  const [detail, setDetail] = useState<SessionDetail>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      try {
        const nextDetail = await client.getSession(session.id);
        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch (error) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Unable to load session detail",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [client, session.id]);

  async function handleOpen() {
    await onOpened?.();
    await open(session.url);
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildSessionMarkdown(session, detail)}
      navigationTitle={session.title}
      actions={
        <ActionPanel>
          <Action title="Open in Devin" icon={Icon.ArrowRight} onAction={handleOpen} />
          <Action.Push
            title="Send Message"
            icon={Icon.Message}
            target={<SendMessageForm sessionId={session.id} onSent={onSent} />}
          />
          <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
          <Action.CopyToClipboard title="Copy Session URL" content={session.url} />
          {session.pullRequestUrl ? (
            <Action.OpenInBrowser title="Open Pull Request" url={session.pullRequestUrl} icon={Icon.Code} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
