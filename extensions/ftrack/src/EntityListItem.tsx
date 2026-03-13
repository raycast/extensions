import { Color, List, Image, ActionPanel, Action, getPreferenceValues, Icon } from "@raycast/api";
import slugify from "slugify";
import ChangeStatusCommand from "./ChangeStatusCommand";
import SearchEntitiesCommand from "./search_entities";

import {
  AssetVersionEntity,
  ListEntity,
  Preferences,
  ProjectEntity,
  ReviewSessionEntity,
  SearchableEntity,
  TypedContextEntity,
} from "./types";

const preferences = getPreferenceValues<Preferences>();

const currentLocale = Intl.DateTimeFormat().resolvedOptions().locale;

function formatDate(date: string) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString(currentLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.substring(1);
}

function linkToPath(link: { name: string }[]) {
  return link
    .slice(1)
    .map((item) => slugify(item.name, { lower: true }))
    .join("/");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EntityListItemProps<EntityType = any> {
  entity: EntityType;
  configuration: EntityListItemConfiguration<EntityType>;
  revalidate: () => void;
}

export function EntityListItem({ entity, configuration, revalidate, ...props }: EntityListItemProps) {
  return (
    <List.Item
      title={configuration.title(entity)}
      subtitle={configuration.subtitle?.(entity)}
      icon={
        configuration.thumbnail && {
          source: configuration.thumbnail?.(entity),
          mask: Image.Mask.RoundedRectangle,
        }
      }
      accessories={configuration.accessories?.(entity)}
      actions={configuration.actions?.(entity, { revalidate })}
      {...props}
    />
  );
}

interface EntityListItemConfiguration<EntityType = SearchableEntity> {
  namePlural: string;
  projection: string[];
  order: string;
  title: (entity: EntityType) => List.Item.Props["title"];
  subtitle?: (entity: EntityType) => List.Item.Props["subtitle"];
  thumbnail?: (entity: EntityType) => Image.Source;
  accessories?: (entity: EntityType) => List.Item.Props["accessories"];
  actions?: (entity: EntityType, { revalidate }: { revalidate: () => void }) => List.Item.Props["actions"];
}

export const configuration = {
  AssetVersion: {
    namePlural: "versions",
    projection: ["id", "asset.name", "link", "version", "thumbnail_url", "status.name", "status.color"],
    order: "asset.name, version desc",
    title: (entity) => `${entity.asset?.name} - v${entity.version}`,
    subtitle: (entity) =>
      entity.link
        .slice(0, -1)
        .map((item) => item.name)
        .join("/"),
    thumbnail: (entity) => entity.thumbnail_url.value,
    accessories: (entity) => [{ tag: { value: entity.status.name, color: entity.status.color } }],
    actions: (entity, { revalidate }) => (
      <ActionPanel>
        <Action.OpenInBrowser
          url={`${preferences.ftrackServerUrl}/#itemId=home&slideEntityType=assetversion&slideEntityId=${entity.id}`}
        />
        <Action.OpenInBrowser
          title="Play"
          icon={Icon.Play}
          url={`${preferences.ftrackServerUrl}/player/version/${entity.id}`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
        <Action.Push
          title="Change Status"
          icon={Icon.ArrowRightCircle}
          target={<ChangeStatusCommand entityType="AssetVersion" entityId={entity.id} onStatusChanged={revalidate} />}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
        <Action.CopyToClipboard
          title="Copy Entity ID"
          content={entity.id}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel>
    ),
  } as EntityListItemConfiguration<AssetVersionEntity>,
  Project: {
    namePlural: "projects",
    projection: ["id", "full_name", "thumbnail_url", "status", "project_schema.name", "end_date"],
    order: "full_name",
    title: (entity) => entity.full_name,
    subtitle: (entity) => entity.project_schema.name,
    thumbnail: (entity) => entity.thumbnail_url.value,
    accessories: (entity) => [
      {
        tag: {
          value: toSentenceCase(entity.status),
          color: entity.status === "active" ? Color.Green : Color.SecondaryText,
        },
      },
      {
        date: entity.end_date ? new Date(entity.end_date) : null,
      },
    ],
    actions: (entity) => (
      <ActionPanel>
        <Action.OpenInBrowser
          url={`${preferences.ftrackServerUrl}/#itemId=projects&entityType=show&entityId=${entity.id}&slideEntityType=show&slideEntityId=${entity.id}`}
        />
        <Action.OpenInBrowser
          title="Play"
          icon={Icon.Play}
          url={`${preferences.ftrackServerUrl}/player/context/${entity.id}`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
        <Action.Push
          title="Search Versions"
          icon={Icon.MagnifyingGlass}
          target={
            <SearchEntitiesCommand
              key={`${entity.id}--AssetVesion`}
              entityType="AssetVersion"
              placeholder={`Search Versions in ${entity.full_name}`}
              contextId={entity.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
        />
        <Action.Push
          title="Search Objects"
          icon={Icon.MagnifyingGlass}
          target={
            <SearchEntitiesCommand
              key={`${entity.id}--TypedCotext`}
              entityType="TypedContext"
              placeholder={`Search Objects in ${entity.full_name}`}
              contextId={entity.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
        />
        <Action.Push
          title="Search Reviews"
          icon={Icon.MagnifyingGlass}
          target={
            <SearchEntitiesCommand
              key={`${entity.id}--ReviewSesion`}
              entityType="ReviewSession"
              placeholder={`Search Reviews in ${entity.full_name}`}
              contextId={entity.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
        />
        <Action.Push
          title="Search Lists"
          icon={Icon.MagnifyingGlass}
          target={
            <SearchEntitiesCommand
              key={`${entity.id}-List`}
              entityType="List"
              placeholder={`Search Lists in ${entity.full_name}`}
              contextId={entity.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
        />
        <Action.CopyToClipboard
          title="Copy Entity ID"
          content={entity.id}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel>
    ),
  } as EntityListItemConfiguration<ProjectEntity>,
  ReviewSession: {
    namePlural: "reviews",
    projection: ["id", "name", "is_open", "thumbnail_url", "created_at"],
    order: "created_at desc",
    title: (entity) => entity.name,
    subtitle: (entity) => formatDate(entity.created_at),
    thumbnail: (entity) => entity.thumbnail_url.value,
    accessories: (entity) => [
      {
        tag: {
          value: entity.is_open ? "Open" : "Closed",
          color: entity.is_open ? Color.Green : Color.SecondaryText,
        },
      },
    ],
    actions: (entity) => (
      <ActionPanel>
        <Action.OpenInBrowser
          url={`${preferences.ftrackServerUrl}/#itemId=projects&entityType=reviewsession&entityId=${entity.id}`}
        />
        <Action.OpenInBrowser
          title="Play"
          icon={Icon.Play}
          url={`${preferences.ftrackServerUrl}/player/review/${entity.id}`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
        <Action.CopyToClipboard
          title="Copy Entity ID"
          content={entity.id}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel>
    ),
  } as EntityListItemConfiguration<ReviewSessionEntity>,
  List: {
    namePlural: "lists",
    projection: ["id", "name", "is_open", "project.thumbnail_url", "project.full_name", "category.name"],
    order: "project.full_name, category.name, name",
    title: (entity) => entity.name,
    subtitle: (entity) => entity.category.name,
    thumbnail: (entity) => entity.project.thumbnail_url.value,
    accessories: (entity) => [
      {
        tag: {
          value: entity.is_open ? "Open" : "Closed",
          color: entity.is_open ? Color.Green : Color.SecondaryText,
        },
      },
    ],
    actions: (entity) => (
      <ActionPanel>
        <Action.OpenInBrowser
          url={`${preferences.ftrackServerUrl}/#itemId=projects&entityType=list&entityId=${entity.id}`}
        />
        <Action.OpenInBrowser
          title="Play"
          icon={Icon.Play}
          url={`${preferences.ftrackServerUrl}/player/list/${entity.id}`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
        <Action.CopyToClipboard
          title="Copy Entity ID"
          content={entity.id}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel>
    ),
  } as EntityListItemConfiguration<ListEntity>,
  TypedContext: {
    namePlural: "objects",
    projection: [
      "id",
      "name",
      "link",
      "thumbnail_url",
      "type.name",
      "type.color",
      "object_type.name",
      "object_type.is_typeable",
      "object_type.is_statusable",
      "object_type.is_prioritizable",
      "status.name",
      "status.color",
      "priority.name",
      "priority.color",
      "end_date",
    ],
    order: "name",
    title: (entity) => entity.name,
    subtitle: (entity) => entity.link.map((item) => item.name).join("/"),
    thumbnail: (entity) => entity.thumbnail_url.value,
    accessories: (entity) => [
      {
        tag: {
          value: entity.object_type.is_typeable ? entity.type.name : entity.object_type.name,
          color: entity.object_type.is_typeable ? entity.type.color : null,
        },
      },
      {
        tag: {
          value: entity.object_type.is_prioritizable ? entity.priority.name : null,
          color: entity.object_type.is_prioritizable ? entity.priority.color : null,
        },
      },
      {
        date: entity.end_date ? new Date(entity.end_date) : null,
      },
      {
        tag: {
          value: entity.object_type.is_statusable ? entity.status.name : null,
          color: entity.object_type.is_statusable ? entity.status.color : null,
        },
      },
    ],
    actions: (entity, { revalidate }) => (
      <ActionPanel>
        <Action.OpenInBrowser
          url={`${preferences.ftrackServerUrl}/#itemId=home&slideEntityType=task&slideEntityId=${entity.id}`}
        />
        <Action.OpenInBrowser
          title="Play"
          icon={Icon.Play}
          url={`${preferences.ftrackServerUrl}/player/context/${entity.id}`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
        {entity.object_type.is_statusable ? (
          <Action.Push
            title="Change Status"
            icon={Icon.ArrowRightCircle}
            target={<ChangeStatusCommand entityType="TypedContext" entityId={entity.id} onStatusChanged={revalidate} />}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        ) : null}
        <Action.Push
          title="Search Versions"
          icon={Icon.MagnifyingGlass}
          target={
            <SearchEntitiesCommand
              key={`${entity.id}-AssetVersion`}
              entityType="AssetVersion"
              placeholder={`Search Versions in ${entity.name}`}
              contextId={entity.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
        />
        <Action.Push
          title="Search Objects"
          icon={Icon.MagnifyingGlass}
          target={
            <SearchEntitiesCommand
              key={`${entity.id}-TypedContext`}
              entityType="TypedContext"
              placeholder={`Search Objects in ${entity.name}`}
              contextId={entity.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy Entity ID"
          content={entity.id}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
        <Action.CopyToClipboard
          title="Copy Branch Name"
          content={linkToPath(entity.link)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
        />
      </ActionPanel>
    ),
  } as EntityListItemConfiguration<TypedContextEntity>,
};
