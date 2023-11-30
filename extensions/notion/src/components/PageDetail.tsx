import { FormulaPropertyItemObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ActionPanel, Detail, Action, Icon, Image, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

import { fetchPageContent, getPageName, notionColorToTintColor, PagePropertyType, Page, User } from "../utils/notion";
import { handleOnOpenPage } from "../utils/openPage";

import { AppendToPageForm } from "./forms";

type PageDetailProps = {
  page: Page;
  setRecentPage: (page: Page) => Promise<void>;
  users?: User[];
};

export function PageDetail({ page, setRecentPage, users }: PageDetailProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const pageName = getPageName(page);

  const { data, isLoading, mutate } = useCachedPromise(
    async (id) => {
      const fetchedPageContent = await fetchPageContent(id);

      return fetchedPageContent && fetchedPageContent.markdown ? fetchedPageContent : undefined;
    },
    [page.id],
  );

  useEffect(() => {
    setRecentPage(page);
  }, [page.id]);

  const lastEditedUser = users?.find((u) => u.id === page.last_edited_user);
  const createdByUser = users?.find((u) => u.id === page.created_by);

  return (
    <Detail
      markdown={`# ${page.title}\n` + (data ? data.markdown : "*Loading...*")}
      isLoading={isLoading}
      navigationTitle={pageName}
      {...(showMetadata
        ? {
            metadata: (
              <Detail.Metadata>
                {page.last_edited_time ? (
                  <Detail.Metadata.Label
                    title="Last Edited"
                    icon={
                      lastEditedUser?.avatar_url
                        ? { source: lastEditedUser.avatar_url, mask: Image.Mask.Circle }
                        : undefined
                    }
                    text={`${formatDistanceToNow(new Date(page.last_edited_time))}${
                      lastEditedUser ? ` by ${lastEditedUser.name}` : ""
                    }`}
                  />
                ) : null}
                {Object.entries(page.properties).map(([title, value]) => {
                  return getMetadata(title, value, users);
                })}

                {createdByUser ? (
                  <Detail.Metadata.Label
                    title="Created By"
                    icon={
                      createdByUser.avatar_url
                        ? { source: createdByUser.avatar_url, mask: Image.Mask.Circle }
                        : undefined
                    }
                    text={createdByUser.name ? createdByUser.name : "Unknown"}
                  />
                ) : null}
              </Detail.Metadata>
            ),
          }
        : null)}
      actions={
        page.url ? (
          <ActionPanel>
            <ActionPanel.Section title={page.title ? page.title : "Untitled"}>
              <Action
                title="Open in Notion"
                icon="notion-logo.png"
                onAction={() => {
                  handleOnOpenPage(page, setRecentPage);
                }}
              />

              <Action
                title={showMetadata ? "Hide Metadata" : "Show Metadata"}
                icon={Icon.Sidebar}
                onAction={() => setShowMetadata(!showMetadata)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Append Content to Page"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={<AppendToPageForm page={page} onContentUpdate={mutate} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Paste
                title="Paste Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function getMetadata(
  title: string,
  value: PagePropertyType | (FormulaPropertyItemObjectResponse["formula"] & { id: string }),
  users?: User[],
): JSX.Element | null {
  switch (value.type) {
    case "boolean":
      return (
        <Detail.Metadata.Label
          key={value.id}
          title={title}
          icon={value.boolean ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          text={value.boolean ? "Checked" : "Unchecked"}
        />
      );
    case "checkbox":
      return (
        <Detail.Metadata.Label
          key={value.id}
          title={title}
          icon={value.checkbox ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          text={value.checkbox ? "Checked" : "Unchecked"}
        />
      );
    case "date": {
      if (!value.date) return null;

      const startDate = new Date(value.date.start);
      const endDate = value.date.end ? new Date(value.date.end) : undefined;

      let displayedDate = format(startDate, "MMMM dd yyyy");

      if (endDate) {
        displayedDate += ` → ${format(endDate, "MMMM d, yyyy")}`;
      }

      return <Detail.Metadata.Label key={value.id} title={title} icon={Icon.Calendar} text={displayedDate} />;
    }
    case "email":
      return value.email ? (
        <Detail.Metadata.Link key={value.id} title={title} text={value.email} target={`mailto:${value.email}`} />
      ) : null;
    case "formula":
      return value.formula ? getMetadata(title, { id: value.id, ...value.formula }, users) : null;
    case "multi_select":
      return value.multi_select.length > 0 ? (
        <Detail.Metadata.TagList key={value.id} title={title}>
          {value.multi_select.map((option) => {
            return <Detail.Metadata.TagList.Item key={option.id} text={option.name} color={option.color} />;
          })}
        </Detail.Metadata.TagList>
      ) : (
        <Detail.Metadata.Label key={value.id} title={title} text="None" />
      );
    case "number":
      return value.number ? <Detail.Metadata.Label key={value.id} title={title} text={String(value.number)} /> : null;
    case "people":
      return value.people.length > 0 ? (
        <Detail.Metadata.TagList key={value.id} title={title}>
          {value.people.map((person) => {
            const user = users?.find((u) => u.id === person.id);
            return user ? (
              <Detail.Metadata.TagList.Item
                key={person.id}
                text={user.name ?? "Unknown"}
                icon={user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : Icon.Person}
              />
            ) : null;
          })}
        </Detail.Metadata.TagList>
      ) : (
        <Detail.Metadata.Label key={value.id} title={title} text="None" />
      );
    case "phone_number":
      return value.phone_number ? (
        <Detail.Metadata.Link
          key={value.id}
          title={title}
          text={value.phone_number}
          target={`tel:${value.phone_number}`}
        />
      ) : null;
    case "rich_text":
      return value.rich_text.length > 0 ? (
        <Detail.Metadata.Label key={value.id} title={title} text={value.rich_text[0]?.plain_text} />
      ) : null;
    case "select":
      return value.select ? (
        <Detail.Metadata.TagList key={value.id} title={title}>
          <Detail.Metadata.TagList.Item color={notionColorToTintColor(value.select.color)} text={value.select.name} />
        </Detail.Metadata.TagList>
      ) : null;
    case "status":
      return value.status ? (
        <Detail.Metadata.TagList key={value.id} title={title}>
          <Detail.Metadata.TagList.Item color={notionColorToTintColor(value.status.color)} text={value.status.name} />
        </Detail.Metadata.TagList>
      ) : null;
    case "title":
      return value.title.length > 0 ? (
        <Detail.Metadata.Label key={value.id} title={title} text={value.title[0]?.plain_text} />
      ) : null;
    case "url":
      return value.url ? <Detail.Metadata.Link key={value.id} title={title} text={title} target={value.url} /> : null;
    default:
      return null;
  }
}
