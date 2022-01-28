import { List, ImageLike, showToast, ToastStyle, randomId } from "@raycast/api";
import { Page, DatabasePropertyOption, notionColorToTintColor } from "../../utils/notion";
import { ActionEditPageProperty, PageListItem } from "..";
import { DatabaseListView } from "./DatabaseListView";
import { DatabaseViewProps } from "./types";

export function DatabaseKanbanView(props: DatabaseViewProps): JSX.Element | null {
  // Get database page list info
  const { databaseId, databasePages, databaseProperties, databaseView, onForceRerender, saveDatabaseView } = props;

  // Get kanban view settings
  const kanbanView = databaseView?.kanban;
  const propertyId = kanbanView?.property_id;
  const backlogIds = kanbanView?.backlog_ids ? kanbanView.backlog_ids : [];
  const notStartedIds = kanbanView?.not_started_ids ? kanbanView.not_started_ids : [];
  const startedIds = kanbanView?.started_ids ? kanbanView.started_ids : [];
  const completedIds = kanbanView?.completed_ids ? kanbanView.completed_ids : [];
  const canceledIds = kanbanView?.canceled_ids ? kanbanView.canceled_ids : [];

  if (!propertyId) return null;

  // Section Order: Started > Not Started > Completed > Canceled > Backlog | Other (hidden)
  const sectionIds = startedIds.concat(notStartedIds).concat(completedIds).concat(canceledIds).concat(backlogIds);

  // Action Order: Backlog > Started > Not Started > Completed > Canceled > Other
  const actionEditIds = backlogIds.concat(notStartedIds).concat(startedIds).concat(completedIds).concat(canceledIds);

  // Get kanban status
  const statusProperty = databaseProperties.find(function (dp) {
    return dp.id === propertyId;
  });

  if (!statusProperty) {
    showToast(ToastStyle.Failure, "Kanban property missing", "Please edit view configuration");
    return (
      <DatabaseListView
        key={`database-${databaseId}-view-list`}
        databaseId={databaseId}
        databasePages={databasePages}
        databaseProperties={databaseProperties}
        databaseView={databaseView}
        onForceRerender={onForceRerender}
        saveDatabaseView={saveDatabaseView}
      />
    );
  }

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

  const databaseSections: { pages: Page[]; name: string; icon: ImageLike; id: string }[] = [];
  const tempSections: Record<string, Page[]> = {};

  databasePages.forEach(function (p) {
    const prop = p.properties[propertyId];

    const propId = prop && "select" in prop && prop.select?.id ? prop.select.id : "_select_null_";
    if (!tempSections[propId]) {
      tempSections[propId] = [];
    }

    tempSections[propId].push(p);
  });

  const optionsMap: Record<string, DatabasePropertyOption> = {};
  const customOptions: DatabasePropertyOption[] = [];

  (statusProperty.options as DatabasePropertyOption[])
    ?.sort(function (dpa, dpb) {
      const value_a = dpa.id ? actionEditIds.indexOf(dpa.id) : -1;
      const value_b = dpb.id ? actionEditIds.indexOf(dpb.id) : -1;

      if (value_a === -1) return 1;

      if (value_b === -1) return -1;

      if (value_a > value_b) return 1;

      if (value_a < value_b) return -1;

      return 0;
    })
    .forEach(function (option) {
      if (!option.id) {
        return;
      }
      optionsMap[option.id] = option;
      customOptions.push({
        icon: statusSourceIcon(option.id),
        color: option.color,
        name: option.name,
        id: option.id,
      });
    });

  sectionIds.forEach(function (sectionId: string) {
    if (!tempSections[sectionId]) return;

    databaseSections.push({
      id: randomId(),
      pages: tempSections[sectionId],
      name: optionsMap[sectionId]?.name,
      icon: { source: statusSourceIcon(sectionId), tintColor: notionColorToTintColor(optionsMap[sectionId]?.color) },
    });
  });

  const SectionElement: JSX.Element[] = [];

  databaseSections?.map(function (ds) {
    SectionElement.push(
      <List.Section
        key={`kanban-section-${ds.id}`}
        title={ds.name}
        subtitle={ds?.pages?.length + (ds?.pages?.length > 1 ? " Items" : " Item")}
      >
        {ds?.pages?.map(function (p) {
          return (
            <PageListItem
              key={`kanban-section-${ds.id}-page-${p.id}`}
              keywords={[ds.name]}
              page={p}
              icon={ds.icon}
              customActions={[
                <ActionEditPageProperty
                  key={`kanban-section-${ds.id}-page-${p.id}-custom-edit-status-action`}
                  databaseProperty={statusProperty}
                  customOptions={customOptions}
                  pageId={p.id}
                  pageProperty={p.properties[propertyId]}
                  icon={"./icon/kanban_status_started.png"}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onForceRerender={onForceRerender}
                />,
              ]}
              databaseView={databaseView}
              databaseProperties={databaseProperties}
              saveDatabaseView={saveDatabaseView}
              onForceRerender={onForceRerender}
            />
          );
        })}
      </List.Section>
    );
  });

  return SectionElement as unknown as JSX.Element;
}
