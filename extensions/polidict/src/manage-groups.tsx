import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { createApiClient } from "./api";
import { useGroups, useUserProfile } from "./hooks";
import { CurrentLanguageActions } from "./components/CurrentLanguageActions";
import { CommandShell, type CommandShellContext } from "./core/command-shell";
import { invalidateGroupsCache, invalidateLearningItemsCache } from "./features/shared/query-keys";
import { formatRaycastError } from "./utils";
import type { Group, SupportedLanguage } from "./types";

function GroupForm({
  group,
  currentLanguage,
  authIdentity,
  onSaved,
}: {
  group?: Group;
  currentLanguage: SupportedLanguage;
  authIdentity: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { name: string; description: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = createApiClient();
      const languageCode = currentLanguage.languageCode;

      const description = values.description.trim() || null;

      if (group) {
        await client.groups.editGroup(languageCode, group.id, {
          name,
          description,
          imageUrl: group.imageUrl ?? null,
          accessType: group.accessType ?? null,
        });
      } else {
        await client.groups.createGroup(languageCode, {
          name,
          description: description ?? undefined,
        });
      }

      invalidateGroupsCache(authIdentity, languageCode);
      onSaved();
      pop();

      await showToast({
        style: Toast.Style.Success,
        title: group ? "Group updated" : "Group created",
        message: name,
      });
    } catch (error) {
      const userError = formatRaycastError(error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={group ? `Edit ${group.name}` : "Create Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={group ? "Save" : "Create"}
            icon={group ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Group name" defaultValue={group?.name ?? ""} />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description"
        defaultValue={group?.description ?? ""}
      />
    </Form>
  );
}

const PAGE_SIZE = 20;

function ManageGroupsContent({ authIdentity, currentLanguage, languageActions, signOutAction }: CommandShellContext) {
  const [searchText, setSearchText] = useState("");
  const { canCreateGroups } = useUserProfile(authIdentity);

  const [page, setPage] = useState(1);
  const [accumulatedGroups, setAccumulatedGroups] = useState<Group[]>([]);
  const lastProcessedPage = useRef(0);

  useEffect(() => {
    setPage(1);
    setAccumulatedGroups([]);
    lastProcessedPage.current = 0;
  }, [currentLanguage.languageCode]);

  const {
    data: groups,
    hasNext,
    isLoading,
    revalidate: revalidateHook,
  } = useGroups(currentLanguage, authIdentity, {
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (!groups) return;

    if (page === 1) {
      setAccumulatedGroups(groups);
      lastProcessedPage.current = 1;
    } else if (page > lastProcessedPage.current) {
      setAccumulatedGroups((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const newGroups = groups.filter((g) => !existingIds.has(g.id));
        return [...prev, ...newGroups];
      });
      lastProcessedPage.current = page;
    }
  }, [groups, page]);

  const revalidate = useCallback(() => {
    setPage(1);
    setAccumulatedGroups([]);
    lastProcessedPage.current = 0;
    revalidateHook();
  }, [revalidateHook]);

  function loadMore() {
    if (hasNext && !isLoading) {
      setPage((p) => p + 1);
    }
  }

  const filtered = searchText
    ? accumulatedGroups.filter((g) => g.name.toLowerCase().includes(searchText.toLowerCase()))
    : accumulatedGroups;

  async function deleteGroup(group: Group) {
    const confirmed = await confirmAlert({
      title: "Delete Group",
      message: `Are you sure you want to delete "${group.name}"? Items in this group will not be deleted.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const client = createApiClient();
      await client.groups.deleteGroup(currentLanguage.languageCode, group.id);

      setAccumulatedGroups((prev) => prev.filter((g) => g.id !== group.id));
      invalidateGroupsCache(authIdentity, currentLanguage.languageCode);
      invalidateLearningItemsCache(authIdentity, currentLanguage.languageCode);

      await showToast({ style: Toast.Style.Success, title: "Group deleted" });
    } catch (error) {
      const userError = formatRaycastError(error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter groups…" onSearchTextChange={setSearchText} throttle>
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title={searchText ? "No groups match" : "No groups yet"}
          description={searchText ? "Try a different search" : "Create a group to organize your vocabulary"}
          actions={
            <ActionPanel>
              {canCreateGroups && (
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Group"
                  target={
                    <GroupForm
                      currentLanguage={currentLanguage}
                      authIdentity={authIdentity}
                      onSaved={() => revalidate()}
                    />
                  }
                />
              )}
              <CurrentLanguageActions {...languageActions} />
              {signOutAction}
            </ActionPanel>
          }
        />
      ) : (
        <>
          {filtered.map((group) => (
            <List.Item
              key={group.id}
              icon={Icon.Folder}
              title={group.name}
              subtitle={group.description}
              accessories={group.accessType === "PUBLIC" ? [{ tag: "Public" }] : []}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit"
                    target={
                      <GroupForm
                        group={group}
                        currentLanguage={currentLanguage}
                        authIdentity={authIdentity}
                        onSaved={() => revalidate()}
                      />
                    }
                  />
                  {canCreateGroups && (
                    <Action.Push
                      icon={Icon.Plus}
                      title="Create Group"
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={
                        <GroupForm
                          currentLanguage={currentLanguage}
                          authIdentity={authIdentity}
                          onSaved={() => revalidate()}
                        />
                      }
                    />
                  )}
                  <Action
                    icon={Icon.Trash}
                    title="Delete"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteGroup(group)}
                  />
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                  <CurrentLanguageActions {...languageActions} />
                  {signOutAction}
                </ActionPanel>
              }
            />
          ))}
          {hasNext && (
            <List.Item
              icon={isLoading ? Icon.Clock : Icon.ArrowDown}
              title={isLoading ? "Loading…" : "Load More…"}
              actions={
                <ActionPanel>
                  <Action icon={Icon.ArrowDown} title="Load More" onAction={loadMore} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

export default function ManageGroups() {
  return <CommandShell>{(context) => <ManageGroupsContent {...context} />}</CommandShell>;
}
