import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  open,
  Image,
  List,
} from "@raycast/api";
import { format, formatDistanceToNow } from "date-fns";

import {
  DatabaseProperty,
  deleteDatabase,
  deletePage,
  getPageIcon,
  notionColorToTintColor,
  Page,
  PageProperty,
  User,
} from "../utils/notion";
import { handleOnOpenPage } from "../utils/openPage";
import { DatabaseView } from "../utils/types";

import { DatabaseList } from "./DatabaseList";
import { PageDetail } from "./PageDetail";
import { ActionEditPageProperty, ActionSetVisibleProperties } from "./actions";
import ActionCreateQuicklink from "./actions/ActionCreateQuicklink";
import { AppendToPageForm, CreatePageForm, DatabaseViewForm } from "./forms";

type PageListItemProps = {
  page: Page;
  databaseView?: DatabaseView;
  databaseProperties?: DatabaseProperty[];
  setDatabaseView?: (databaseView: DatabaseView) => Promise<void>;
  setRecentPage: (page: Page) => Promise<void>;
  removeRecentPage: (id: string) => Promise<void>;
  mutate: () => Promise<void>;
  users?: User[];
  icon?: Image.ImageLike;
  customActions?: JSX.Element[];
};

export function PageListItem({
  page,
  customActions,
  databaseProperties,
  databaseView,
  setRecentPage,
  removeRecentPage,
  setDatabaseView,
  icon = getPageIcon(page),
  users,
  mutate,
}: PageListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (databaseView && databaseView.properties) {
    const properties = Object.keys(databaseView.properties).map((propId) =>
      Object.entries(page.properties).find(([, e]) => {
        return e.id == propId;
      }),
    );

    const propertyAccessories = properties
      .map((property) => {
        const [title, value] = property ?? [];
        if (!value || !title) return undefined;
        return getPropertyAccessory(value, title, users);
      })
      .filter(Boolean);

    accessories.push(...(propertyAccessories.flat() as List.Item.Accessory[]));
  }

  const lastEditedUser = users?.find((u) => u.id === page.last_edited_user);
  if (page.last_edited_time) {
    const date = new Date(page.last_edited_time);
    accessories.push({
      date,
      icon: lastEditedUser?.avatar_url ? { source: lastEditedUser.avatar_url, mask: Image.Mask.Circle } : undefined,
      tooltip: `Last Edited: ${format(date, "EEE d MMM yyyy 'at' HH:mm")}${
        lastEditedUser ? ` by ${lastEditedUser.name}` : ""
      }`,
    });
  }

  const quickEditProperties = databaseProperties?.filter((property) =>
    ["checkbox", "status", "select", "multi_select", "status", "people"].includes(property.type),
  );

  const visiblePropertiesIds: string[] =
    databaseProperties?.filter((dp: DatabaseProperty) => databaseView?.properties?.[dp.id]).map((dp) => dp.id) || [];

  const title = page.title ? page.title : "Untitled";

  const OpenInRaycastAction =
    page.object == "page" ? (
      <Action.Push
        title="Preview Page"
        icon={Icon.BlankDocument}
        target={<PageDetail page={page} setRecentPage={setRecentPage} users={users} />}
      />
    ) : (
      <Action.Push
        title="Navigate to Database"
        icon={Icon.List}
        target={
          <DatabaseList
            databasePage={page}
            setRecentPage={setRecentPage}
            removeRecentPage={removeRecentPage}
            users={users}
          />
        }
      />
    );
  const OpenInAppAction = (
    <Action title={`Open in App`} icon={"notion-logo.png"} onAction={() => handleOnOpenPage(page, setRecentPage)} />
  );
  const OpenInBrowserAction = (
    <Action
      title={`Open in Browser`}
      icon={Icon.Globe}
      onAction={async () => {
        if (!page.url) return;
        if (open_in?.name === "Notion") {
          open(page.url);
        } else open(page.url, open_in);
        await setRecentPage(page);
        closeMainWindow();
      }}
    />
  );

  const { primaryAction, open_in } = getPreferenceValues<Preferences.SearchPage>();

  const OpenPageActions =
    open_in?.name == "Notion" // Default app is Notion
      ? primaryAction == "notion"
        ? [OpenInAppAction, OpenInRaycastAction, OpenInBrowserAction]
        : [OpenInRaycastAction, OpenInAppAction, OpenInBrowserAction]
      : primaryAction == "notion"
        ? [OpenInBrowserAction, OpenInRaycastAction]
        : [OpenInRaycastAction, OpenInBrowserAction];

  const pageWord = page.object.charAt(0).toUpperCase() + page.object.slice(1);

  return (
    <List.Item
      title={title}
      icon={{ value: icon, tooltip: pageWord }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={title}>
            {...OpenPageActions}
            {customActions?.map((action) => action)}
            {databaseProperties ? (
              <ActionPanel.Submenu
                title="Edit Property"
                icon={Icon.BulletPoints}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              >
                {quickEditProperties?.map((dp: DatabaseProperty) => (
                  <ActionEditPageProperty
                    key={dp.id}
                    databaseProperty={dp}
                    pageId={page.id}
                    pageProperty={page.properties[dp.id]}
                    mutate={mutate}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {page.object === "page" ? (
              <Action.Push
                title="Append Content to Page"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AppendToPageForm page={page} />}
              />
            ) : (
              <Action.Push
                title="Create New Page"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreatePageForm defaults={{ database: page.id }} mutate={mutate} />}
              />
            )}

            <ActionCreateQuicklink page={page} />

            <Action
              title={`Delete ${pageWord}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: `Delete ${pageWord}`,
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    message: `Do you want to delete this ${page.object}? Don't worry, you'll be able to restore it from Notion's trash.`,
                  })
                ) {
                  if (page.object === "database") {
                    deleteDatabase(page.id);
                  } else {
                    deletePage(page.id);
                  }
                  await removeRecentPage(page.id);
                  await mutate();
                }
              }}
            />
          </ActionPanel.Section>

          {databaseProperties && setDatabaseView ? (
            <ActionPanel.Section title="View options">
              {page.parent_database_id ? (
                <Action.Push
                  title="Set View Type"
                  icon={databaseView?.type ? `./icon/view_${databaseView.type}.png` : "./icon/view_list.png"}
                  shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "v" }}
                  target={
                    <DatabaseViewForm
                      databaseId={page.parent_database_id}
                      databaseView={databaseView}
                      setDatabaseView={setDatabaseView}
                    />
                  }
                />
              ) : null}
              <ActionSetVisibleProperties
                databaseProperties={databaseProperties}
                selectedPropertiesIds={visiblePropertiesIds}
                onSelect={(propertyId: string) => {
                  setDatabaseView({
                    ...databaseView,
                    properties: { ...databaseView?.properties, [propertyId]: {} },
                  });
                }}
                onUnselect={(propertyId: string) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { [propertyId]: _, ...remainingProperties } = databaseView?.properties ?? {};

                  setDatabaseView({
                    ...databaseView,
                    properties: remainingProperties,
                  });
                }}
              />
            </ActionPanel.Section>
          ) : null}

          {page.url ? (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title={`Copy ${pageWord} URL`}
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Formatted URL"
                content={{
                  html: `<a href="${page.url}" title="${title}">${title}</a>`,
                  text: title,
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              <Action.Paste
                title={`Paste ${pageWord} URL`}
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
              <Action.CopyToClipboard
                title={`Copy ${pageWord} Title`}
                content={title}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}

function getPropertyAccessory(
  property: PageProperty | Extract<PageProperty, { type: "formula" }>["value"],
  title: string,
  users?: User[],
): List.Item.Accessory | List.Item.Accessory[] | undefined {
  if (property.value === null) return;
  switch (property.type) {
    case "boolean":
    case "checkbox":
      return {
        icon: property.value ? Icon.CheckCircle : Icon.Circle,
        tooltip: `${title}: ${property.value ? "Checked" : "Unchecked"}`,
      };
    case "date": {
      const start = new Date(property.value.start);
      return {
        text: formatDistanceToNow(start, { addSuffix: true }),
        tooltip: `${title}: ${format(start, "EEE d MMM yyyy")}`,
      };
    }
    case "email":
    case "phone_number":
    case "url":
      return { text: property.value, tooltip: `${title}: ${property.value}` };
    case "formula":
      return getPropertyAccessory(property.value, title);
    case "multi_select":
      return property.value.map((option) => {
        return {
          tag: { value: option.name, color: notionColorToTintColor(option.color) },
          tooltip: `${title}: ${option.name}`,
        };
      });
    case "number":
      return { text: property.value.toString(), tooltip: `${title}: ${property.value}` };
    case "people":
      return property.value.map((person) => {
        const user = users?.find((u) => u.id === person.id);
        return {
          text: user?.name ?? "Unknown",
          icon: user?.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : Icon.Person,
          tooltip: `${title}: ${user?.name ?? "Unknown"}`,
        };
      });
    case "rich_text":
    case "title": {
      if (property.value.length == 0 && property.type == "rich_text") return;
      const text = property.value[0]?.plain_text ?? "Untitled";
      return { text, tooltip: `${title}: ${text}` };
    }
    case "select":
    case "status":
      return {
        tag: { value: property.value.name, color: notionColorToTintColor(property.value.color) },
        tooltip: `${title}: ${property.value.name}`,
      };
  }
}
