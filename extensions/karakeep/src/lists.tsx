import { Action, ActionPanel, confirmAlert, Form, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { useForm } from "@raycast/utils";
import React, { useCallback, useMemo } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateList, fetchDeleteList, fetchUpdateList } from "./apis";
import { BookmarkList } from "./components/BookmarkList";
import { QueryBuilderActions } from "./components/QueryBuilderActions";
import { useConfig } from "./hooks/useConfig";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetListsBookmarks } from "./hooks/useGetListsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { connectionGuard } from "./components/ConnectionErrorView";
import { isEmoji, makeSmartQueryValidator } from "./utils/formatting";
import { DEFAULT_LIST_ICON, ListIconField } from "./components/ListIconField";
import { runWithToast } from "./utils/toast";
import { revalidated } from "./utils/fetchError";
import { labelLists } from "./utils/listLabels";

const log = logger.child("[Lists]");

interface ListNode {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
  type?: "manual" | "smart";
  description?: string;
  query?: string;
  children?: ListNode[];
}

function buildHierarchy(lists: ListNode[]): ListNode[] {
  const listMap = new Map(lists.map((list) => [list.id, { ...list, children: [] as ListNode[] }]));
  const rootLists: ListNode[] = [];

  lists.forEach((list) => {
    if (list.parentId === null) {
      rootLists.push(listMap.get(list.id)!);
    } else {
      const parent = listMap.get(list.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(listMap.get(list.id)!);
      }
    }
  });

  return rootLists;
}

function ListBookmarksView({ listId, listName }: { listId: string; listName: string }) {
  const { bookmarks, isLoading, error, hasLiveData, revalidate, pagination } = useGetListsBookmarks(listId);
  const { t } = useTranslation();

  const handleRefresh = async () => {
    await runWithToast({
      loading: { title: t("refreshingLists"), message: t("pleaseWait") },
      success: { title: t("listsRefreshed") },
      failure: { title: t("refreshError") },
      action: async () => {
        try {
          log.log("Refreshing list bookmarks", { listId, listName });
          await revalidated(revalidate);
          log.info("List bookmarks refreshed", { listId });
        } catch (error) {
          log.error("Failed to refresh list bookmarks", { listId, listName, error });
          throw error;
        }
      },
    });
  };

  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      error={error}
      hasLiveData={hasLiveData}
      onRefresh={handleRefresh}
      pagination={pagination}
      searchBarPlaceholder={t("list.searchInList", { name: listName })}
      emptyViewTitle={t("list.noBookmarks.title")}
      emptyViewDescription={t("list.noBookmarks.description")}
    />
  );
}

function ArchivedBookmarks() {
  const { bookmarks, isLoading, error, hasLiveData, revalidate, pagination } = useGetAllBookmarks({
    archived: true,
  });
  const { t } = useTranslation();

  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      error={error}
      hasLiveData={hasLiveData}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("list.searchInArchived")}
      emptyViewTitle={t("list.noArchived.title")}
      emptyViewDescription={t("list.noArchived.description")}
    />
  );
}

function FavoritedBookmarks() {
  const { bookmarks, isLoading, error, hasLiveData, revalidate, pagination } = useGetAllBookmarks({
    favourited: true,
  });
  const { t } = useTranslation();

  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      error={error}
      hasLiveData={hasLiveData}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("list.searchInFavorites")}
      emptyViewTitle={t("list.noFavorites.title")}
      emptyViewDescription={t("list.noFavorites.description")}
    />
  );
}

interface ListFormValues {
  name: string;
  icon: string;
  description: string;
  parentId: string;
  type: string;
  query: string;
}

function CreateListForm({ lists, onCreated }: { lists: ListNode[]; onCreated: () => void }) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps, setValue, values } = useForm<ListFormValues>({
    initialValues: { name: "", icon: DEFAULT_LIST_ICON, description: "", parentId: "", type: "manual", query: "" },
    validation: {
      name: (value) => (!value?.trim() ? t("common.fieldRequired", { field: t("list.listName") }) : undefined),
      icon: (value) => (!isEmoji(value || "") ? t("list.listIconInvalid") : undefined),
      query: makeSmartQueryValidator(t),
    },
    async onSubmit(values) {
      log.info("Creating list", { name: values.name, type: values.type, query: values.query || undefined });
      const result = await runWithToast({
        loading: { title: t("list.toast.create.loading") },
        success: { title: t("list.toast.create.success") },
        failure: { title: t("list.toast.create.error") },
        action: async () => {
          const payload = {
            name: values.name.trim(),
            icon: values.icon.trim() || DEFAULT_LIST_ICON,
            description: values.description.trim() || undefined,
            parentId: values.parentId || undefined,
            type: values.type as "manual" | "smart",
            query: values.type === "smart" ? values.query?.trim() : undefined,
          };
          log.debug("Sending create list request", payload);
          await fetchCreateList(payload);
          log.info("List created successfully", { name: values.name });
          onCreated();
        },
      });
      if (result !== undefined) pop();
    },
  });

  return (
    <Form
      navigationTitle={t("list.createList")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("list.createList")} onSubmit={handleSubmit} icon={Icon.Plus} />
          {values.type === "smart" && (
            <QueryBuilderActions query={values.query} onInsert={(q) => setValue("query", q)} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title={t("list.listName")}
        placeholder={t("list.listNamePlaceholder")}
        autoFocus
      />
      <ListIconField {...itemProps.icon} />
      <Form.TextField
        {...itemProps.description}
        title={t("list.listDescription")}
        placeholder={t("list.listDescriptionPlaceholder")}
      />
      <Form.Dropdown {...itemProps.parentId} title={t("list.listParent")}>
        <Form.Dropdown.Item value="" title={t("list.listParentNone")} />
        {labelLists(lists).map(({ list: l, label }) => (
          <Form.Dropdown.Item key={l.id} value={l.id} title={l.icon ? `${l.icon} ${label}` : label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.type} title={t("list.listType")}>
        <Form.Dropdown.Item value="manual" title={t("list.listTypeManual")} />
        <Form.Dropdown.Item value="smart" title={t("list.listTypeSmart")} />
      </Form.Dropdown>
      {values.type === "smart" && (
        <Form.TextField
          {...itemProps.query}
          title={t("list.listQuery")}
          placeholder={t("list.listQueryPlaceholder")}
          info={t("list.listQueryDescription")}
        />
      )}
    </Form>
  );
}

function EditListForm({ list, lists, onUpdated }: { list: ListNode; lists: ListNode[]; onUpdated: () => void }) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps, setValue, values } = useForm<ListFormValues>({
    initialValues: {
      name: list.name,
      icon: list.icon || DEFAULT_LIST_ICON,
      description: list.description || "",
      parentId: list.parentId || "",
      type: list.type || "manual",
      query: list.query || "",
    },
    validation: {
      name: (value) => (!value?.trim() ? t("common.fieldRequired", { field: t("list.listName") }) : undefined),
      icon: (value) => (!isEmoji(value || "") ? t("list.listIconInvalid") : undefined),
      query: makeSmartQueryValidator(t),
    },
    async onSubmit(values) {
      log.info("Updating list", { listId: list.id, name: values.name, type: values.type });
      const result = await runWithToast({
        loading: { title: t("list.toast.update.loading") },
        success: { title: t("list.toast.update.success") },
        failure: { title: t("list.toast.update.error") },
        action: async () => {
          const payload = {
            name: values.name.trim(),
            icon: values.icon.trim() || DEFAULT_LIST_ICON,
            description: values.description.trim() || undefined,
            parentId: values.parentId || null,
            type: values.type as "manual" | "smart",
            query: values.type === "smart" ? values.query?.trim() : undefined,
          };
          log.debug("Sending update list request", { listId: list.id, ...payload });
          await fetchUpdateList(list.id, payload);
          log.info("List updated successfully", { listId: list.id });
          onUpdated();
        },
      });
      if (result !== undefined) pop();
    },
  });

  // Exclude the list being edited from parent options to prevent cycles
  const parentOptions = lists.filter((l) => l.id !== list.id);

  return (
    <Form
      navigationTitle={t("list.editList")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("list.editList")} onSubmit={handleSubmit} icon={Icon.Pencil} />
          {values.type === "smart" && (
            <QueryBuilderActions query={values.query} onInsert={(q) => setValue("query", q)} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title={t("list.listName")}
        placeholder={t("list.listNamePlaceholder")}
        autoFocus
      />
      <ListIconField {...itemProps.icon} />
      <Form.TextField
        {...itemProps.description}
        title={t("list.listDescription")}
        placeholder={t("list.listDescriptionPlaceholder")}
      />
      <Form.Dropdown {...itemProps.parentId} title={t("list.listParent")}>
        <Form.Dropdown.Item value="" title={t("list.listParentNone")} />
        {labelLists(parentOptions).map(({ list: l, label }) => (
          <Form.Dropdown.Item key={l.id} value={l.id} title={l.icon ? `${l.icon} ${label}` : label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.type} title={t("list.listType")}>
        <Form.Dropdown.Item value="manual" title={t("list.listTypeManual")} />
        <Form.Dropdown.Item value="smart" title={t("list.listTypeSmart")} />
      </Form.Dropdown>
      {values.type === "smart" && (
        <Form.TextField
          {...itemProps.query}
          title={t("list.listQuery")}
          placeholder={t("list.listQueryPlaceholder")}
          info={t("list.listQueryDescription")}
        />
      )}
    </Form>
  );
}

const getDashboardListsPage = (apiUrl: string, listId: string) => `${apiUrl}/dashboard/lists/${listId}`;

interface ListItemProps {
  list: ListNode;
  /** Disambiguated name — see labelLists. Falls back to list.name. */
  label: string;
  level: number;
  apiUrl: string;
  onOpen: (list: ListNode) => void;
  onEdit: (list: ListNode) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}

function ListItem({ list, label, level, apiUrl, onOpen, onEdit, onCreate, onDelete, t }: ListItemProps) {
  const icon = list.icon || (list.type === "smart" ? "✨" : undefined);
  return (
    <List.Item
      key={list.id}
      icon={icon}
      title={`${"  ".repeat(level)}${label}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={t("list.openList")}
              onAction={() => onOpen(list)}
              icon={Icon.List}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action
              title={t("list.editList")}
              onAction={() => onEdit(list)}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
            <Action
              title={t("list.createList")}
              onAction={onCreate}
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={getDashboardListsPage(apiUrl, list.id)} title={t("common.viewInBrowser")} />
            <Action.CopyToClipboard
              title={t("common.copyId")}
              content={list.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("list.deleteList")}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDelete(list.id)}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Lists() {
  const { isLoading, lists, error, hasLiveData, revalidate } = useGetAllLists();
  const { push } = useNavigation();
  const { config } = useConfig();
  const { t } = useTranslation();
  const { apiUrl } = config;

  const handleDeleteList = useCallback(
    async (id: string) => {
      const list = lists?.find((list) => list.id === id);
      const listName = list?.name;

      // Declining the confirmation is a normal outcome, not an error. It used to
      // raise a red Failure toast reading "Delete cancelled", which reports a
      // successful no-op as a problem — and no other confirmAlert in this
      // extension says anything when you back out. Stay silent to match.
      if (
        !(await confirmAlert({
          title: t("list.deleteList"),
          message: t("list.deleteConfirm", { name: listName || "" }),
        }))
      ) {
        return;
      }

      await runWithToast({
        loading: { title: t("common.deleting") },
        success: { title: t("common.deleteSuccess") },
        failure: { title: t("common.deleteFailed") },
        action: async () => {
          try {
            log.info("Deleting list", { listId: id, listName });
            await fetchDeleteList(id);
            // Plain revalidate, NOT revalidated(): the list is already gone. A
            // refresh that fails here must not turn a completed delete into
            // "Couldn't delete list" — the hook's own onError reports it.
            await revalidate();
            log.info("List deleted", { listId: id });
          } catch (error) {
            log.error("Failed to delete list", { listId: id, listName, error });
            throw error;
          }
        },
      });
    },
    [lists, revalidate, t],
  );

  const handleShowFavoritedBookmarks = useCallback(() => {
    push(<FavoritedBookmarks />);
  }, [push]);

  const handleShowArchivedBookmarks = useCallback(() => {
    push(<ArchivedBookmarks />);
  }, [push]);

  const handleCreateList = useCallback(() => {
    push(<CreateListForm lists={(lists as ListNode[]) || []} onCreated={revalidate} />);
  }, [push, revalidate, lists]);

  const hierarchicalLists = useMemo(() => {
    if (!lists) return [];
    const sorted = [...lists].sort((a, b) => a.name.localeCompare(b.name)) as ListNode[];
    return buildHierarchy(sorted);
  }, [lists]);

  // Indentation shows the hierarchy while browsing, but Raycast's filtering
  // hides the parent rows — so a search for "hunt" leaves two identically
  // titled entries with the nesting that distinguished them off screen.
  const listLabels = useMemo(
    () => new Map(labelLists(lists ?? []).map(({ list, label }) => [list.id, label])),
    [lists],
  );

  const renderListItems = useCallback(
    (items: ListNode[], level = 0) => {
      return items.flatMap((list) => {
        const result = [
          <ListItem
            key={list.id}
            list={list}
            label={listLabels.get(list.id) ?? list.name}
            level={level}
            apiUrl={apiUrl}
            onOpen={(l) => push(<ListBookmarksView listId={l.id} listName={l.name} />)}
            onEdit={(l) => push(<EditListForm list={l} lists={(lists as ListNode[]) || []} onUpdated={revalidate} />)}
            onCreate={handleCreateList}
            onDelete={handleDeleteList}
            t={t}
          />,
        ];
        if (list.children?.length) {
          result.push(...renderListItems(list.children, level + 1));
        }
        return result;
      });
    },
    [apiUrl, push, revalidate, handleCreateList, handleDeleteList, t, lists, listLabels],
  );

  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title={t("list.createList")}
            onAction={handleCreateList}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    >
      {!isLoading && lists.length === 0 && (
        <List.EmptyView
          title={t("list.empty.title")}
          description={t("list.empty.description")}
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title={t("list.createList")}
                onAction={handleCreateList}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        icon="⭐️"
        title={t("list.favorites")}
        actions={
          <ActionPanel>
            <Action
              title={t("list.openFavorites")}
              onAction={handleShowFavoritedBookmarks}
              icon={Icon.List}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.OpenInBrowser url={`${apiUrl}/dashboard/favourites`} title={t("common.viewInBrowser")} />
            <Action
              title={t("list.createList")}
              onAction={handleCreateList}
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="📦"
        title={t("list.archived")}
        actions={
          <ActionPanel>
            <Action
              title={t("list.openArchived")}
              onAction={handleShowArchivedBookmarks}
              icon={Icon.List}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.OpenInBrowser url={`${apiUrl}/dashboard/archive`} title={t("common.viewInBrowser")} />
            <Action
              title={t("list.createList")}
              onAction={handleCreateList}
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel>
        }
      />
      {renderListItems(hierarchicalLists)}
    </List>
  );
}
