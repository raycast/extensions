import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { Project, Member } from "../types";
import { getAvatarIcon, useFetch } from "@raycast/utils";
import { API_HEADERS, callApi, generateApiUrl } from "../api";

export default function Members({ project }: { project: Project }) {
  const { isLoading, data: members, mutate } = useFetch(generateApiUrl(`projects/${project.id}/members`), {
    headers: API_HEADERS,
    mapResult(result: { data: Member[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
    failureToastOptions: {
      title: "Failed to fetch members",
    },
  });

  async function resendInvite(member: Member) {
    const toast = await showToast(Toast.Style.Animated, "Resending", member.email);
    try {
      await callApi(`projects/${project.id}/members/${member.id}`, { method: "POST" });
      toast.style = Toast.Style.Success;
      toast.title = "Resent";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not resend invite";
      toast.message = `${error}`;
    }
  }
  
  async function confirmAndRemove(member: Member) {
    const options: Alert.Options = {
      title: "Do you really want to remove this member?",
      message: member.email,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive
      }
    }
    if (!await confirmAlert(options)) return;

    const toast = await showToast(Toast.Style.Animated, "Removing", member.email);
    try {
      await mutate(
        callApi(`projects/${project.id}/members/${member.id}`, { method: "DELETE" }), {
          optimisticUpdate(data) {
            return data.filter(m => m.id!==member.id)
          },
        }
      )
      toast.style = Toast.Style.Success;
      toast.title = "Removed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not remove";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {members.map((member) => (
        <List.Item
          key={member.id}
          icon={member.is_owner ? Icon.StarCircle : getAvatarIcon(member.email)}
          title={member.email}
          subtitle={member.is_owner ? "Owner" : "User"}
          accessories={[
            {
              text: member.status,
              icon: {
                source: Icon.CircleFilled,
                tintColor: member.status === "active" ? Color.Green : member.status==="invited" ? Color.Orange : undefined,
              }
            }
          ]}
          actions={<ActionPanel>
            {member.status==="invited" && <Action icon={Icon.Envelope} title="Resend Invite" onAction={() => resendInvite(member)} />}
            {!member.is_owner && <Action icon={Icon.Trash} title="Remove" onAction={() => confirmAndRemove(member)} />}
          </ActionPanel>}
        />
      ))}
    </List>
  );
}
