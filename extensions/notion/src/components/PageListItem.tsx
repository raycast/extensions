import { FormulaPropertyItemObjectResponse } from "@notionhq/client/build/src/api-endpoints";
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
  property: PageProperty | FormulaPropertyItemObjectResponse["formula"],
  title: string,
  users?: User[],
): List.Item.Accessory | List.Item.Accessory[] | undefined {
  switch (property.type) {
    case "boolean":
      return {
        icon: property.boolean ? Icon.CheckCircle : Icon.Circle,
        tooltip: `${title}: ${property.boolean ? "Checked" : "Unchecked"}`,
      };
    case "checkbox":
      return {
        icon: property.checkbox ? Icon.CheckCircle : Icon.Circle,
        tooltip: `${title}: ${property.checkbox ? "Checked" : "Unchecked"}`,
      };
    case "date": {
      if (!property.date) return;
      const start = new Date(property.date.start);
      return {
        text: formatDistanceToNow(start, { addSuffix: true }),
        tooltip: `${title}: ${format(start, "EEE d MMM yyyy")}`,
      };
    }
    case "email":
      if (!property.email) return;
      return { text: property.email, tooltip: `${title}: ${property.email}` };
    case "formula":
      if (!property.formula) return;
      return getPropertyAccessory(property.formula, title);
    case "multi_select":
      return property.multi_select.map((option) => {
        return {
          tag: { value: option.name, color: notionColorToTintColor(option.color) },
          tooltip: `${title}: ${option.name}`,
        };
      });
    case "number":
      if (!property.number) return;
      return { text: property.number.toString(), tooltip: `${title}: ${property.number}` };
    case "people":
      return property.people.map((person) => {
        const user = users?.find((u) => u.id === person.id);
        return {
          text: user?.name ?? "Unknown",
          icon: user?.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : Icon.Person,
          tooltip: `${title}: ${user?.name ?? "Unknown"}`,
        };
      });
    case "phone_number":
      if (!property.phone_number) return;
      return { text: property.phone_number, tooltip: `${title}: ${property.phone_number}` };
    case "rich_text": {
      const text = property.rich_text[0]?.plain_text;
      if (!property.rich_text[0]) return;
      return { text, tooltip: `${title}: ${text}` };
    }
    case "title": {
      const text = property.title[0]?.plain_text ?? "Untitled";
      return { text, tooltip: `${title}: ${text}` };
    }
    case "url":
      if (!property.url) return;
      return { text: property.url, tooltip: `${title}: ${property.url}` };
    case "select":
      if (!property.select) return;
      return {
        tag: { value: property.select.name, color: notionColorToTintColor(property.select.color) },
        tooltip: `${title}: ${property.select.name}`,
      };
    case "status":
      if (!property.status) return;
      return {
        tag: { value: property.status.name, color: notionColorToTintColor(property.status.color) },
        tooltip: `${title}: ${property.status.name}`,
      };
  }
}
