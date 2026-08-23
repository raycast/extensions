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
import { clientFor, dashboardOrgUrl } from "../lib/clerk";
import { EditOrgForm } from "./org-edit-form";
import { OrgInvitations } from "./org-invitations";
import { OrgInvitationCreateForm } from "./org-invitation-create-form";
import { getPageParams, computeHasMore } from "../lib/pagination";
import { PAGE_SIZE } from "../lib/hooks";
import { showClerkError } from "../lib/errors";
import { UserDetail } from "./user-detail";
import { FieldDetailList, hasEntries, sizedImage, type DetailField } from "./field-detail";
import { ROLE_PRESETS } from "../lib/roles";

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
        {!ROLE_PRESETS.includes(role) && (
          <Form.Dropdown.Item value={role} title={role.trim() ? `${role} (custom)` : "Select a role…"} />
        )}
        {ROLE_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={preset} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="role" title="Role (custom allowed)" value={role} onChange={setRole} />
    </Form>
  );
}

function OrgMembers({ app, organizationId, orgName }: { app: ClerkApp; organizationId: string; orgName: string }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (orgId: string, query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).organizations.getOrganizationMembershipList({
        organizationId: orgId,
        query: query || undefined,
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [organizationId, searchText],
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
      await mutate(clientFor(app).organizations.deleteOrganizationMembership({ organizationId, userId }), {
        optimisticUpdate: (list) => list.filter((x) => x.id !== m.id),
      });
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
      navigationTitle={`Members · ${orgName}`}
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
                    target={<UserDetail app={app} userId={userId} />}
                  />
                )}
                {userId && (
                  <Action.Push
                    title="Change Role"
                    icon={Icon.Pencil}
                    target={
                      <ChangeRoleForm
                        app={app}
                        organizationId={organizationId}
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

export function OrgDetail({
  app,
  organizationId,
  orgName,
}: {
  app: ClerkApp;
  organizationId: string;
  orgName: string;
}) {
  const {
    data: org,
    isLoading,
    revalidate: revalidateOrg,
  } = useCachedPromise(
    (id: string) => clientFor(app).organizations.getOrganization({ organizationId: id, includeMembersCount: true }),
    [organizationId],
    { onError: showClerkError },
  );

  const fields: DetailField[] = [];
  if (org) {
    fields.push({ id: "name", label: "Name", value: org.name, icon: Icon.Building });
    fields.push({ id: "id", label: "Org ID", value: org.id, icon: Icon.Fingerprint });
    if (org.slug) fields.push({ id: "slug", label: "Slug", value: org.slug, icon: Icon.Link });
    if (hasEntries(org.publicMetadata))
      fields.push({
        id: "public",
        label: "Public Metadata",
        value: JSON.stringify(org.publicMetadata),
        icon: Icon.Code,
      });
    if (hasEntries(org.privateMetadata))
      fields.push({
        id: "private",
        label: "Private Metadata",
        value: JSON.stringify(org.privateMetadata),
        icon: Icon.Lock,
      });
  }

  const markdown = org ? (org.imageUrl ? `![logo](${sizedImage(org.imageUrl)})` : "") : "Loading…";

  const metadata = org && (
    <>
      <List.Item.Detail.Metadata.Label
        title="Members"
        text={typeof org.membersCount === "number" ? String(org.membersCount) : "—"}
      />
      <List.Item.Detail.Metadata.Label title="Created" text={new Date(org.createdAt).toLocaleString()} />
    </>
  );

  const actions = org && (
    <ActionPanel.Section title="Organization">
      <Action.Push
        title="Edit Organization"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<EditOrgForm app={app} organizationId={organizationId} onSaved={() => revalidateOrg()} />}
      />
      <Action.Push
        title="View Members"
        icon={Icon.PersonLines}
        target={<OrgMembers app={app} organizationId={organizationId} orgName={orgName} />}
      />
      <Action.Push
        title="View Invitations"
        icon={Icon.Envelope}
        target={<OrgInvitations app={app} organizationId={organizationId} orgName={orgName} />}
      />
      <Action.Push
        title="Create Invitation"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        target={<OrgInvitationCreateForm app={app} organizationId={organizationId} onSaved={() => revalidateOrg()} />}
      />
      <Action.OpenInBrowser title="Open in Clerk Dashboard" icon={Icon.Globe} url={dashboardOrgUrl(organizationId)} />
    </ActionPanel.Section>
  );

  return (
    <FieldDetailList
      isLoading={isLoading}
      navigationTitle={`Organization · ${orgName}`}
      fields={fields}
      markdown={markdown}
      metadata={metadata}
      actions={actions}
    />
  );
}
