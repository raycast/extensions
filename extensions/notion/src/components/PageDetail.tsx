import { ActionPanel, Detail, Action, Icon, Image, Color, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

import { fetchPageContent, getPageName, notionColorToTintColor, PageProperty, Page, User } from "../utils/notion";
import { handleOnOpenPage } from "../utils/openPage";

import { AppendToPageForm } from "./forms";

function pagePropertyToText(
  property: PageProperty | (Extract<PageProperty, { type: "formula" }>["value"] & { id: string }),
): string | undefined {
  if (property.value === null) return;
  switch (property.type) {
    case "checkbox":
      return property.value ? "Checked" : "Unchecked";
    case "date": {
      if (!property.value) return;
      let displayedDate = property.value.start;
      if (property.value.end) displayedDate += ` → ${property.value.end}`;
      return displayedDate;
    }
    case "email":
      return property.value;
    case "formula":
      return pagePropertyToText({ ...property.value, id: property.id });
    case "multi_select":
      return property.value.map((option) => option.name).join(", ");
    case "number":
      return String(property.value);
    case "people":
      // For people, we can only show the IDs without another query.
      // That's not very useful so don't show anything.
      return;
    case "rich_text":
      return property.value.map((text) => text.plain_text).join("");
    case "title":
      // The title is already shown in the page preview, so no need to show it again.
      return;
    case "relation":
      // For relations, we can only show the IDs without another query.
      // That's not very useful so don't show anything.
      return;
    default:
      // Don't show unsupported types in the preview.
      return;
  }
}

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

      const blocks = [];

      if (getPreferenceValues().properties_in_page_previews) {
        for (const [key, value] of Object.entries(page.properties)) {
          const propertyText = pagePropertyToText(value);
          if (propertyText) {
            blocks.push(`**${key}**: ${propertyText}\n`);
          }
        }
      }

      if (blocks.length > 0) {
        blocks.push("---\n");
      }

      if (fetchedPageContent && fetchedPageContent.markdown) {
        blocks.push(fetchedPageContent.markdown);
      }

      return { markdown: blocks.join("\n") };
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
  property: PageProperty | (Extract<PageProperty, { type: "formula" }>["value"] & { id: string }),
  users?: User[],
): JSX.Element | null {
  if (property.value === null) return null;
  switch (property.type) {
    case "checkbox":
      return (
        <Detail.Metadata.Label
          key={property.id}
          title={title}
          icon={property.value ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          text={property.value ? "Checked" : "Unchecked"}
        />
      );
    case "date": {
      if (!property.value) return null;
      let displayedDate = format(property.value.start, "MMMM dd yyyy");
      if (property.value.end) displayedDate += ` → ${format(new Date(property.value.end), "MMMM d, yyyy")}`;
      return <Detail.Metadata.Label key={property.id} title={title} icon={Icon.Calendar} text={displayedDate} />;
    }
    case "email":
      return (
        <Detail.Metadata.Link
          key={property.id}
          title={title}
          text={property.value}
          target={`mailto:${property.value}`}
        />
      );
    case "formula":
      return getMetadata(title, { ...property.value, id: property.id }, users);
    case "multi_select":
      return property.value.length > 0 ? (
        <Detail.Metadata.TagList key={property.id} title={title}>
          {property.value.map((option) => {
            return <Detail.Metadata.TagList.Item key={option.id} text={option.name} color={option.color} />;
          })}
        </Detail.Metadata.TagList>
      ) : (
        <Detail.Metadata.Label key={property.id} title={title} text="None" />
      );
    case "number":
      return <Detail.Metadata.Label key={property.id} title={title} text={String(property.value)} />;
    case "people":
      return property.value.length > 0 ? (
        <Detail.Metadata.TagList key={property.id} title={title}>
          {property.value.map((person) => {
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
        <Detail.Metadata.Label key={property.id} title={title} text="None" />
      );
    case "phone_number":
      return (
        <Detail.Metadata.Link key={property.id} title={title} text={property.value} target={`tel:${property.value}`} />
      );
    case "rich_text":
    case "title":
      return property.value.length > 0 ? (
        <Detail.Metadata.Label key={property.id} title={title} text={property.value[0]?.plain_text} />
      ) : null;
    case "select":
    case "status":
      return (
        <Detail.Metadata.TagList key={property.id} title={title}>
          <Detail.Metadata.TagList.Item
            color={notionColorToTintColor(property.value.color)}
            text={property.value.name}
          />
        </Detail.Metadata.TagList>
      );
    case "url":
      return <Detail.Metadata.Link key={property.id} title={title} text={title} target={property.value} />;
    default:
      return null;
  }
}
