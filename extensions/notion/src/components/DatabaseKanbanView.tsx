import { List, showToast, Toast, useNavigation } from "@raycast/api";

import { KanbanConfig } from "../hooks";
import { Page, DatabaseProperty, User, isType, notionColorToTintColor } from "../utils/notion";

import { ActionEditPageProperty, EditPropertyOptions } from "./actions";
import { DatabaseViewForm } from "./forms";

import { PageListItem } from ".";

interface DatabaseKanbanViewProps {
  kanbanConfig: KanbanConfig;
  databaseId: string;
  databasePages: Page[];
  databaseProperties: DatabaseProperty[];
  setRecentPage: (page: Page) => Promise<void>;
  removeRecentPage: (id: string) => Promise<void>;
  mutate: () => Promise<void>;
  users?: User[];
}

export function DatabaseKanbanView({
  kanbanConfig,
  databaseId,
  databasePages,
  databaseProperties,
  setRecentPage,
  removeRecentPage,
  mutate,
  users,
}: DatabaseKanbanViewProps) {
  const statusProperty = databaseProperties.find((dp) => dp.id === kanbanConfig.property_id);

  if (!statusProperty || !isType(statusProperty, "status", "select")) {
    const { push } = useNavigation();
    push(DatabaseViewForm({ databaseId }));
    showToast({ title: "Status property missing", style: Toast.Style.Failure });
    return [];
  }

  const {
    backlog_ids: backlogIds,
    not_started_ids: notStartedIds,
    started_ids: startedIds,
    completed_ids: completedIds,
    canceled_ids: canceledIds,
  } = kanbanConfig;

  const mappedPages: Record<string, Page[]> = {};
  databasePages.forEach((page) => {
    const statusProperty = Object.values(page.properties).find((p) => p.id == kanbanConfig.property_id);

    if (!statusProperty || !isType(statusProperty, "status", "select")) return; // This should never occur.

    let statusId = "_select_null_";
    if (statusProperty.value) statusId = statusProperty.value.id;

    if (!mappedPages[statusId]) mappedPages[statusId] = [];
    mappedPages[statusId].push(page);
  });

  const statusOptions: Record<string, EditPropertyOptions> = {};
  // Action Order: Backlog > Started > Not Started > Completed > Canceled > Other
  const actionEditIds = backlogIds.concat(notStartedIds).concat(startedIds).concat(completedIds).concat(canceledIds);
  statusProperty.config.options
    .sort((dpa, dpb) => {
      const valueA = dpa.id ? actionEditIds.indexOf(dpa.id) : -1;
      if (valueA == -1) return 1;
      const valueB = dpb.id ? actionEditIds.indexOf(dpb.id) : -1;
      if (valueB == -1) return -1;
      return valueA - valueB;
    })
    .forEach((option) => {
      statusOptions[option.id] = {
        ...option,
        icon: statusSourceIcon(option.id, kanbanConfig),
      };
    });

  // Section Order: Started > Not Started > Completed > Canceled > Backlog | Other (hidden)
  const sectionIds = startedIds.concat(notStartedIds).concat(completedIds).concat(canceledIds).concat(backlogIds);

  return sectionIds.map((sectionId) => {
    if (!statusOptions[sectionId]) return null;
    const pages = mappedPages[sectionId];
    const icon = {
      source: statusSourceIcon(sectionId, kanbanConfig),
      tintColor: notionColorToTintColor(statusOptions[sectionId].color),
    };
    return (
      <List.Section
        key={`kanban-section-${sectionId}`}
        title={statusOptions[sectionId].name}
        subtitle={pages.length + (pages.length > 1 ? " Items" : " Item")}
      >
        {pages.map((p) => (
          <PageListItem
            key={`kanban-section-${sectionId}-page-${p.id}`}
            page={p}
            icon={icon}
            setRecentPage={setRecentPage}
            removeRecentPage={removeRecentPage}
            users={users}
            customActions={[
              <ActionEditPageProperty
                key={`kanban-section-${sectionId}-page-${p.id}-custom-edit-status-action`}
                databaseProperty={statusProperty}
                options={Object.values(statusOptions)}
                pageId={p.id}
                pageProperty={p.properties[kanbanConfig.property_id]}
                icon="./icon/kanban_status_started.png"
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                mutate={mutate}
              />,
            ]}
            isKanban={kanbanConfig.active}
            databaseProperties={databaseProperties}
            mutate={mutate}
          />
        ))}
      </List.Section>
    );
  });
}

function statusSourceIcon(dspoId: string, kanbanConfig: KanbanConfig) {
  let source_icon = "icon/kanban_status_backlog.png";

  if (kanbanConfig.not_started_ids.includes(dspoId)) {
    source_icon = "icon/kanban_status_not_started.png";
  }

  if (kanbanConfig.started_ids.includes(dspoId)) {
    const statusIndex = kanbanConfig.started_ids.indexOf(dspoId) + 1;
    const statusSize = kanbanConfig.started_ids.length + 1;
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

  if (kanbanConfig.completed_ids.includes(dspoId)) source_icon = "icon/kanban_status_completed.png";

  if (kanbanConfig.canceled_ids.includes(dspoId)) source_icon = "icon/kanban_status_canceled.png";

  return source_icon;
}
