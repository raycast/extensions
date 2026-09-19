import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  List,
  MenuBarExtra,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { addIssueComment, updateIssueState } from "./api";
import { compactTitle, issueSubtitle, relativeAge } from "./dashboard";
import { IssueWithContext, WorkflowState } from "./types";
import { issueIcon } from "./visual";

type IssueActionProps = {
  issue: IssueWithContext;
  states: WorkflowState[];
  onChanged: () => void | Promise<void>;
};

type IssueListItemProps = IssueActionProps & {
  itemId: string;
};

async function changeState(issue: IssueWithContext, state: WorkflowState, onChanged: () => void | Promise<void>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Moving ${issue.identifier}…` });
  try {
    await updateIssueState(issue.id, state.id);
    toast.style = Toast.Style.Success;
    toast.title = `${issue.identifier} → ${state.name}`;
    await onChanged();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not update ${issue.identifier}`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function safeWebUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function IssueMenu({ issue, states, onChanged }: IssueActionProps) {
  const actionStates = states.filter((state) => ["unstarted", "started", "completed"].includes(state.type));
  const agentSession = issue.agentSession;
  const sessionUrl = agentSession?.url ? safeWebUrl(agentSession.url) : undefined;
  const externalLinks = (issue.agentSession?.externalLinks || []).flatMap((link) => {
    const url = safeWebUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  return (
    <MenuBarExtra.Submenu title={compactTitle(issue)} icon={issueIcon(issue)}>
      <MenuBarExtra.Item title={issueSubtitle(issue)} />
      <MenuBarExtra.Item title="Open in Linear" icon={Icon.Link} onAction={() => open(issue.url)} />
      {sessionUrl ? (
        <MenuBarExtra.Item
          title={`Open ${agentSession!.appUser.displayName || agentSession!.appUser.name} Session`}
          icon={Icon.Bolt}
          onAction={() => open(sessionUrl)}
        />
      ) : null}
      {externalLinks.map((link) => (
        <MenuBarExtra.Item
          key={link.url}
          title={`Open ${link.label}`}
          icon={Icon.Code}
          onAction={() => open(link.url)}
        />
      ))}
      <MenuBarExtra.Separator />
      {actionStates.map((state) => (
        <MenuBarExtra.Item
          key={state.id}
          title={`Move to ${state.name}`}
          icon={state.type === "completed" ? Icon.CheckCircle : Icon.ArrowRight}
          onAction={() => changeState(issue, state, onChanged)}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

export function IssueListItem({ issue, states, onChanged, itemId }: IssueListItemProps) {
  const sessionUrl = issue.agentSession?.url ? safeWebUrl(issue.agentSession.url) : undefined;
  const externalLinks = (issue.agentSession?.externalLinks || []).flatMap((link) => {
    const url = safeWebUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  return (
    <List.Item
      id={itemId}
      title={issue.title}
      subtitle={issue.identifier}
      icon={issueIcon(issue)}
      accessories={[
        ...(issue.attentionReasons.length ? [{ tag: { value: issue.attentionReasons[0] } }] : []),
        ...(issue.agentSession
          ? [{ text: issue.agentSession.appUser.displayName || issue.agentSession.appUser.name }]
          : []),
        { tag: { value: issue.state.name, color: issue.state.color } },
        {
          text: relativeAge(issue.updatedAt),
          tooltip: `Updated ${new Date(issue.updatedAt).toLocaleString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Linear" url={issue.url} />
          {sessionUrl ? <Action.OpenInBrowser title="Open Agent Session" url={sessionUrl} icon={Icon.Bolt} /> : null}
          {externalLinks.map((link) => (
            <Action.OpenInBrowser key={link.url} title={`Open ${link.label}`} url={link.url} icon={Icon.Code} />
          ))}
          <ActionPanel.Submenu title="Change Status" icon={Icon.ArrowRight}>
            {states
              .filter((state) => ["unstarted", "started", "completed"].includes(state.type))
              .map((state) => (
                <Action
                  key={state.id}
                  title={state.name}
                  icon={state.type === "completed" ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => changeState(issue, state, onChanged)}
                />
              ))}
          </ActionPanel.Submenu>
          <Action.Push
            title="Add Progress Note"
            icon={Icon.SpeechBubble}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CommentForm issue={issue} onChanged={onChanged} />}
          />
          <Action.CopyToClipboard title="Copy Issue ID" content={issue.identifier} />
          <Action.CopyToClipboard
            title="Copy Issue Link"
            content={issue.url}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        </ActionPanel>
      }
    />
  );
}

function CommentForm({ issue, onChanged }: Pick<IssueActionProps, "issue" | "onChanged">) {
  const [isLoading, setIsLoading] = useState(false);
  async function submit(values: { body: string }) {
    const body = values.body.trim();
    if (!body) {
      await showToast({ style: Toast.Style.Failure, title: "Add a note before submitting" });
      return;
    }
    setIsLoading(true);
    try {
      await addIssueComment(issue.id, body);
      await showHUD(`Added note to ${issue.identifier}`);
      await onChanged();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not comment on ${issue.identifier}`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Progress note · ${issue.identifier}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Progress Note" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title={issue.identifier} text={issue.title} />
      <Form.TextArea id="body" title="Note" placeholder="What changed, what is blocked, or what needs review?" />
    </Form>
  );
}
