import { Action, ActionPanel, Icon, Toast } from "@raycast/api";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { IssueDetails } from "./IssueDetails";
import { updateIssue, useUsers } from "./sentry";
import { Issue, Organization, User } from "./types";

export type ActionsProps = {
  issue: Issue;
  organization?: Organization;
  mutateList?: MutatePromise<Issue[]>;
  mutateDetail?: MutatePromise<Issue | undefined>;
  isDetail?: boolean;
};

export function Actions(props: ActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!props.isDetail && (
          <Action.Push
            icon={Icon.Sidebar}
            title="Show Details"
            target={
              <IssueDetails issue={props.issue} organization={props.organization} mutateList={props.mutateList} />
            }
          />
        )}
        <Action.OpenInBrowser url={props.issue.permalink} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.organization ? (
          <AssignToAction
            issue={props.issue}
            organization={props.organization}
            mutateList={props.mutateList}
            mutateDetail={props.mutateDetail}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Link"
          content={props.issue.permalink}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Short ID"
          content={props.issue.shortId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function AssignToAction(props: {
  issue: Issue;
  organization: Organization;
  mutateList?: MutatePromise<Issue[]>;
  mutateDetail?: MutatePromise<Issue | undefined>;
}) {
  const { data } = useUsers(props.organization.slug, props.issue.project.id);

  async function assignTo(user: User) {
    const toast = new Toast({ style: Toast.Style.Animated, title: "Assigning issue" });
    await toast.show();

    try {
      if (props.mutateList) {
        await props.mutateList(updateIssue(props.issue, { assignedTo: user.user?.id }), {
          optimisticUpdate(data) {
            if (!data) {
              return [];
            }

            return data.map((x) => (x.id === props.issue.id ? { ...x, assignedTo: user } : x));
          },
        });
      }

      if (props.mutateDetail) {
        await props.mutateDetail(updateIssue(props.issue, { assignedTo: user.user?.id }), {
          optimisticUpdate(data) {
            if (!data) {
              return;
            }

            return { ...data, assignedTo: user };
          },
        });
      }

      toast.style = Toast.Style.Success;
      toast.title = "Assigned issue";
      toast.message = `Assigned ${props.issue.shortId} to ${user.name}`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed assigning issue";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <ActionPanel.Submenu icon={Icon.AddPerson} title="Assign To" shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}>
      {data?.map((user) => (
        <Action
          key={user.id}
          icon={getAvatarIcon(user.name) ?? Icon.PersonCircle}
          title={`${user.name} (${user.email})`}
          onAction={() => assignTo(user)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
