import { List, Image } from "@raycast/api";

import { notionColorToTintColor, isType, Page, DatabaseProperty, PropertyConfig, User } from "../utils/notion";
import type { DatabaseView } from "../utils/types";

import { PageListItem } from "./PageListItem";
import { ActionEditPageProperty } from "./actions";

type DatabaseViewProps = {
  databaseId: string;
  databasePages: Page[];
  databaseProperties: DatabaseProperty[];
  databaseView?: DatabaseView;
  setDatabaseView?: (view: DatabaseView) => Promise<void>;
  setRecentPage: (page: Page) => Promise<void>;
  removeRecentPage: (id: string) => Promise<void>;
  mutate: () => Promise<void>;
  users?: User[];
  sort?: "last_edited_time" | "created_time";
};

export function DatabaseView(props: DatabaseViewProps) {
  const {
    databaseId,
    databasePages,
    databaseProperties,
    databaseView,
    setDatabaseView,
    mutate,
    setRecentPage,
    removeRecentPage,
    users,
  } = props;

  const viewType = databaseView?.type ?? "list";
  const propertyId = databaseView?.kanban?.property_id;
  const statusProperty = databaseProperties.find((dp) => dp.id === propertyId);

  if (viewType === "list" || !propertyId || !statusProperty || !isType(statusProperty, "status", "select")) {
    return (
      <>
        {databasePages?.map((p) => (
          <PageListItem
            key={`database-${databaseId}-page-${p.id}`}
            page={p}
            mutate={mutate}
            databaseProperties={databaseProperties}
            databaseView={databaseView}
            setDatabaseView={setDatabaseView}
            setRecentPage={setRecentPage}
            removeRecentPage={removeRecentPage}
            users={users}
          />
        ))}
      </>
    );
  }

  const {
    backlog_ids: backlogIds = [],
    not_started_ids: notStartedIds = [],
    started_ids: startedIds = [],
    completed_ids: completedIds = [],
    canceled_ids: canceledIds = [],
  } = databaseView?.kanban || {};

  // Section Order: Started > Not Started > Completed > Canceled > Backlog | Other (hidden)
  const sectionIds = startedIds.concat(notStartedIds).concat(completedIds).concat(canceledIds).concat(backlogIds);

  // Action Order: Backlog > Started > Not Started > Completed > Canceled > Other
  const actionEditIds = backlogIds.concat(notStartedIds).concat(startedIds).concat(completedIds).concat(canceledIds);

  function statusSourceIcon(dspoId: string) {
    let source_icon = "icon/kanban_status_backlog.png";

    if (notStartedIds.includes(dspoId)) {
      source_icon = "icon/kanban_status_not_started.png";
    }

    if (startedIds.includes(dspoId)) {
      const statusIndex = startedIds.indexOf(dspoId) + 1;
      const statusSize = startedIds.length + 1;
      const currentStatus = Number.parseFloat((statusIndex / statusSize).toFixed(2));
      let percent = "25";
      if (currentStatus <= 0.26) {
        percent = "25";
      } else if (currentStatus <= 0.34) {
        percent = "33";
      } else if (currentStatus <= 0.51) {
        percent = "50";
      } else if (currentStatus <= 0.67) {
        percent = "66";
      } else {
        percent = "75";
      }
      source_icon = "icon/kanban_status_" + percent + ".png";
    }

    if (completedIds.includes(dspoId)) source_icon = "icon/kanban_status_completed.png";

    if (canceledIds.includes(dspoId)) source_icon = "icon/kanban_status_canceled.png";

    return source_icon;
  }

  const databaseSections: { pages: Page[]; name: string; icon: Image.ImageLike; id: string }[] = [];
  const tempSections: Record<string, Page[]> = {};

  databasePages.forEach((p) => {
    const prop = Object.values(p.properties).find((x) => x.id === propertyId);
    let propId = "_select_null_";

    if (prop && (prop.type == "select" || prop.type == "status") && prop.value) propId = prop.value.id;

    if (!tempSections[propId]) tempSections[propId] = [];

    tempSections[propId].push(p);
  });

  const optionsMap: Record<string, PropertyConfig<"status">["options"][number]> = {};
  const customOptions = statusProperty.config.options
    .filter((opt) => opt.id)
    .sort((dpa, dpb) => {
      const value_a = dpa.id ? actionEditIds.indexOf(dpa.id) : -1;
      const value_b = dpb.id ? actionEditIds.indexOf(dpb.id) : -1;

      if (value_a === -1) return 1;

      if (value_b === -1) return -1;

      if (value_a > value_b) return 1;

      if (value_a < value_b) return -1;

      return 0;
    })
    .map((option) => {
      optionsMap[option.id] = option;
      return {
        icon: statusSourceIcon(option.id),
        color: option.color,
        name: option.name,
        id: option.id,
        description: option.description,
      };
    });

  sectionIds.forEach((sectionId) => {
    if (!tempSections[sectionId]) return;

    databaseSections.push({
      id: sectionId,
      pages: tempSections[sectionId],
      name: optionsMap[sectionId]?.name,
      icon: { source: statusSourceIcon(sectionId), tintColor: notionColorToTintColor(optionsMap[sectionId]?.color) },
    });
  });

  const SectionElement: JSX.Element[] = [];

  databaseSections?.map((ds) => {
    SectionElement.push(
      <List.Section
        key={`kanban-section-${ds.id}`}
        title={ds.name}
        subtitle={ds?.pages?.length + (ds?.pages?.length > 1 ? " Items" : " Item")}
      >
        {ds?.pages?.map((p) => (
          <PageListItem
            key={`kanban-section-${ds.id}-page-${p.id}`}
            page={p}
            icon={ds.icon}
            setRecentPage={setRecentPage}
            removeRecentPage={removeRecentPage}
            users={users}
            customActions={[
              <ActionEditPageProperty
                key={`kanban-section-${ds.id}-page-${p.id}-custom-edit-status-action`}
                databaseProperty={statusProperty}
                options={customOptions}
                pageId={p.id}
                pageProperty={p.properties[propertyId]}
                icon="./icon/kanban_status_started.png"
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                mutate={mutate}
              />,
            ]}
            databaseView={databaseView}
            databaseProperties={databaseProperties}
            setDatabaseView={setDatabaseView}
            mutate={mutate}
          />
        ))}
      </List.Section>,
    );
  });

  return SectionElement as unknown as JSX.Element;
}
