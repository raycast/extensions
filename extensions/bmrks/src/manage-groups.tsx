import AuthenticatedView from "./components/authenticated-view";
import { User } from "@supabase/supabase-js";
import { useGroups } from "../lib/use-groups";
import { FormValidation, useForm } from "@raycast/utils";
import { createGroup, deleteGroup } from "../lib/db";
import type { Group } from "../lib/db";

import { Action, ActionPanel, Form, List, Toast, showToast, useNavigation, confirmAlert, Alert } from "@raycast/api";

export function ManageGroups({ user }: { user: User }) {
  const { data: groups, isLoading: isLoadingGroups, revalidate } = useGroups(user);

  async function doDelete(id: string, name: string) {
    const confirm = await confirmAlert({
      title: `Delete ${name}?`,
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirm) {
      return;
    }
    const res = await deleteGroup(id);
    if (res.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Fail to delete group",
        message: res.error.message,
      });
      return;
    }
    revalidate();
  }

  return (
    <List
      isLoading={isLoadingGroups}
      actions={
        <ActionPanel>
          <Action.Push
            title="Create New Group"
            target={<CreateGroup user={user} groups={groups || []} revalidate={revalidate} />}
          />
        </ActionPanel>
      }
    >
      {groups?.map((group) => {
        return (
          <List.Item
            key={group.id}
            title={group.name}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New Group"
                  target={<CreateGroup user={user} groups={groups || []} revalidate={revalidate} />}
                />
                <Action title="Delete Group" onAction={() => doDelete(group.id, group.name)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function CreateGroup({ user, groups, revalidate }: { user: User; groups: Group[]; revalidate: () => void }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm({
    async onSubmit(data: { name: string; slug: string; user_id: string }) {
      const group = {
        name: data.name,
        slug: data.slug,
        user_id: user.id,
      };

      const existName = groups.find((i: Group) => i.name === data.name || i.slug === data.slug);

      if (existName) {
        const isSlug = existName.name === data.name ? "name" : "slug";
        await showToast({
          style: Toast.Style.Failure,
          title: `You already have a group with this ${isSlug}`,
          message: data[isSlug] as string,
        });
        return;
      }

      const res = await createGroup(group);
      if (res.error) {
        await showToast({ style: Toast.Style.Failure, title: "Fail to create group", message: res.error.message });
        return;
      }
      revalidate();
      pop();
    },
    validation: {
      name: FormValidation.Required,
      slug: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Design" {...itemProps.name} />
      <Form.TextField title="Slug" placeholder="design" {...itemProps.slug} />
    </Form>
  );
}

export default function Command() {
  return <AuthenticatedView component={ManageGroups} />;
}
