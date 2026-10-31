import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { adminUrl, apiUrl } from "./lib/api";
import { useContentTypes, useEntries, useLocales, EntryQuery } from "./lib/services";
import { kindName, entryTitle, entrySubtitle, pluralTitle, searchableFields } from "./lib/utils";
import { ContentType, Entry } from "./types";

export default function ExploreContent() {
  const { isLoading, data, error } = useContentTypes();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter content-types">
      {error ? (
        <ErrorView error={error} />
      ) : (
        data.map((item) => (
          <List.Item
            key={item.uid}
            title={pluralTitle(item)}
            subtitle={item.schema.description}
            accessories={[
              { tag: kindName(item.schema.kind) },
              { icon: item.schema.kind === "singleType" ? Icon.ArrowNe : Icon.ArrowRight },
            ]}
            actions={
              <ActionPanel title={item.schema.displayName}>
                {item.schema.kind === "collectionType" && (
                  <Action.Push
                    icon={Icon.ArrowRight}
                    title={`List ${pluralTitle(item)}`}
                    target={<Entries contentType={item} />}
                  />
                )}
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="Open in Strapi"
                  url={adminUrl(item.uid, item.schema.kind)}
                />
                <Action.CopyToClipboard title="Copy UID" content={item.uid} shortcut={Keyboard.Shortcut.Common.Copy} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function Entries({ contentType }: { contentType: ContentType }) {
  const { draftAndPublish, pluginOptions } = contentType.schema;
  const localized = !!pluginOptions?.i18n?.localized;
  const searchable = searchableFields(contentType).length > 0;

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<EntryQuery>({ status: "draft" });
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const locales = useLocales(localized);
  const { data, isLoading, error, pagination } = useEntries(contentType, { ...query, search });

  const statuses: EntryQuery["status"][] = draftAndPublish ? ["draft", "published"] : [undefined];
  // Without locales (not loaded yet or the request failed), still allow switching status
  const localeOptions =
    localized && locales.data?.length
      ? [...locales.data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      : [undefined];
  const options = statuses.flatMap((status) =>
    localeOptions.map((locale) => ({
      value: `${status ?? ""}|${locale?.code ?? ""}`,
      title: [status === "draft" ? "Draft" : status === "published" ? "Published" : "", locale?.name]
        .filter(Boolean)
        .join(" · "),
    })),
  );

  return (
    <List
      isLoading={isLoading || locales.isLoading}
      isShowingDetail={isShowingDetail && !!data?.length}
      navigationTitle={pluralTitle(contentType)}
      searchBarPlaceholder={`Search ${pluralTitle(contentType).toLowerCase()}`}
      pagination={pagination}
      {...(searchable ? { filtering: false, throttle: true, onSearchTextChange: setSearch } : {})}
      searchBarAccessory={
        options.length > 1 ? (
          <List.Dropdown
            tooltip="Status & Locale"
            onChange={(value) => {
              const [status, locale] = value.split("|");
              setQuery({ status: (status || undefined) as EntryQuery["status"], locale: locale || undefined });
            }}
          >
            {options.map((option) => (
              <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        <ErrorView error={error} />
      ) : (
        data?.map((item) => (
          <List.Item
            key={item.id.toString()}
            title={entryTitle(item, contentType)}
            subtitle={isShowingDetail ? undefined : entrySubtitle(item, contentType)}
            accessories={
              isShowingDetail || !item.updatedAt
                ? undefined
                : [{ date: new Date(item.updatedAt), tooltip: `Updated ${new Date(item.updatedAt).toLocaleString()}` }]
            }
            detail={<EntryDetail entry={item} />}
            actions={
              <ActionPanel title={entryTitle(item, contentType)}>
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="Open in Strapi"
                  url={adminUrl(contentType.uid, contentType.schema.kind, item.documentId)}
                />
                <Action
                  icon={Icon.Sidebar}
                  title={isShowingDetail ? "Hide Details" : "Show Details"}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => setIsShowingDetail((value) => !value)}
                />
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Document ID"
                    content={item.documentId ?? item.id.toString()}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy API URL"
                    content={apiUrl(`${contentType.route}/${item.documentId ?? item.id}`, {
                      status: draftAndPublish ? query.status : undefined,
                      locale: localized ? (item.locale ?? query.locale ?? undefined) : undefined,
                    })}
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                  />
                  <Action.CopyToClipboard
                    title="Copy JSON"
                    content={JSON.stringify(item, null, 2)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function EntryDetail({ entry }: { entry: Entry }) {
  const dates = [
    ["Created", entry.createdAt],
    ["Updated", entry.updatedAt],
    ["Published", entry.publishedAt],
  ] as const;

  return (
    <List.Item.Detail
      markdown={`\`\`\`json\n${JSON.stringify(entry, null, 2)}\n\`\`\``}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={entry.id.toString()} />
          {entry.documentId && <List.Item.Detail.Metadata.Label title="Document ID" text={entry.documentId} />}
          {entry.locale && <List.Item.Detail.Metadata.Label title="Locale" text={entry.locale} />}
          {dates.map(([title, value]) =>
            value ? (
              <List.Item.Detail.Metadata.Label key={title} title={title} text={new Date(value).toLocaleString()} />
            ) : null,
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
