import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { OrganizationMembership } from "@clerk/backend";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { getPageParams, computeHasMore } from "../lib/pagination";
import { PAGE_SIZE } from "../lib/hooks";
import { showClerkError } from "../lib/errors";
import { UserDetail } from "./user-detail";

function memberLabel(m: OrganizationMembership): string {
  const d = m.publicUserData;
  return [d?.firstName, d?.lastName].filter(Boolean).join(" ") || d?.identifier || m.id;
}

function ChangeRoleForm(props: {
  app: ClerkApp;
  organizationId: string;
  userId: string;
  current: string;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const [role, setRole] = useState(props.current);

  async function submit() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating role" });
    try {
      await clientFor(props.app).organizations.updateOrganizationMembership({
        organizationId: props.organizationId,
        userId: props.userId,
        role: role.trim(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Role updated";
      props.onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Role" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="preset" title="Common Roles" value={role} onChange={setRole}>
        <Form.Dropdown.Item value="org:admin" title="org:admin" />
        <Form.Dropdown.Item value="org:member" title="org:member" />
      </Form.Dropdown>
      <Form.TextField id="role" title="Role (custom allowed)" value={role} onChange={setRole} />
    </Form>
  );
}

export function OrgMembers(props: { app: ClerkApp; organizationId: string; orgName: string }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(props.app).organizations.getOrganizationMembershipList({
        organizationId: props.organizationId,
        query: query || undefined,
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [searchText],
    { onError: showClerkError },
  );

  async function removeMember(m: OrganizationMembership) {
    const userId = m.publicUserData?.userId;
    if (!userId) return;
    const ok = await confirmAlert({
      title: `Remove ${memberLabel(m)}?`,
      message: "This removes the member from the organization.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing member" });
    try {
      await mutate(
        clientFor(props.app).organizations.deleteOrganizationMembership({
          organizationId: props.organizationId,
          userId,
        }),
        { optimisticUpdate: (list) => list.filter((x) => x.id !== m.id) },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Member removed";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      navigationTitle={`Members · ${props.orgName}`}
      searchBarPlaceholder="Search members…"
    >
      {(data ?? []).map((m) => {
        const userId = m.publicUserData?.userId;
        return (
          <List.Item
            key={m.id}
            icon={m.publicUserData?.imageUrl ? { source: m.publicUserData.imageUrl } : Icon.Person}
            title={memberLabel(m)}
            subtitle={m.publicUserData?.identifier ?? undefined}
            accessories={[{ tag: m.role }]}
            actions={
              <ActionPanel>
                {userId && (
                  <Action.Push
                    title="View User Details"
                    icon={Icon.Sidebar}
                    target={<UserDetail app={props.app} userId={userId} />}
                  />
                )}
                {userId && (
                  <Action.Push
                    title="Change Role"
                    icon={Icon.Pencil}
                    target={
                      <ChangeRoleForm
                        app={props.app}
                        organizationId={props.organizationId}
                        userId={userId}
                        current={m.role}
                        onDone={() => mutate()}
                      />
                    }
                  />
                )}
                <Action
                  title="Remove Member"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeMember(m)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
