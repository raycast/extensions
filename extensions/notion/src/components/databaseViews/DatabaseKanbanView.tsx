import { List, showToast, Image, Toast, Color } from "@raycast/api";
import { notionColorToTintColor } from "../../utils/notion";
import { Page, DatabasePropertyOption } from "../../utils/types";
import { ActionEditPageProperty } from "../actions";
import { PageListItem } from "../PageListItem";
import { DatabaseListView } from "./DatabaseListView";
import { DatabaseViewProps } from "./types";

export function DatabaseKanbanView(props: DatabaseViewProps): JSX.Element | null {
  // Get database page list info
  const {
    databaseId,
    databasePages,
    databaseProperties,
    databaseView,
    onPageCreated,
    onPageUpdated,
    saveDatabaseView,
  } = props;

  // Get kanban view settings
  const {
    property_id: propertyId,
    backlog_ids: backlogIds = [],
    not_started_ids: notStartedIds = [],
    started_ids: startedIds = [],
    completed_ids: completedIds = [],
    canceled_ids: canceledIds = [],
  } = databaseView?.kanban || {};

  if (!propertyId) {
    showToast({
      style: Toast.Style.Failure,
      title: "Kanban property missing",
      message: "Please edit view configuration",
    });
    return (
      <DatabaseListView
        key={`database-${databaseId}-view-list`}
        databaseId={databaseId}
        databasePages={databasePages}
        databaseProperties={databaseProperties}
        databaseView={databaseView}
        onPageCreated={onPageCreated}
        onPageUpdated={onPageUpdated}
        saveDatabaseView={saveDatabaseView}
      />
    );
  }

  // Section Order: Started > Not Started > Completed > Canceled > Backlog | Other (hidden)
  const sectionIds = startedIds.concat(notStartedIds).concat(completedIds).concat(canceledIds).concat(backlogIds);

  // Action Order: Backlog > Started > Not Started > Completed > Canceled > Other
  const actionEditIds = backlogIds.concat(notStartedIds).concat(startedIds).concat(completedIds).concat(canceledIds);

  // Get kanban status
  const statusProperty = databaseProperties.find((dp) => dp.id === propertyId);

  if (!statusProperty) {
    showToast({
      style: Toast.Style.Failure,
      title: "Kanban property missing",
      message: "Please edit view configuration",
    });
    return (
      <DatabaseListView
        key={`database-${databaseId}-view-list`}
        databaseId={databaseId}
        databasePages={databasePages}
        databaseProperties={databaseProperties}
        databaseView={databaseView}
        onPageCreated={onPageCreated}
        onPageUpdated={onPageUpdated}
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

  const databaseSections: { pages: Page[]; name: string; icon: Image.ImageLike; id: string }[] = [];
  const tempSections: Record<string, Page[]> = {};

  databasePages.forEach((p) => {
    const prop = Object.values(p.properties).find((x) => x.id === propertyId);

    const propId = prop && "select" in prop && prop.select?.id ? prop.select.id : "_select_null_";
    if (!tempSections[propId]) {
      tempSections[propId] = [];
    }

    tempSections[propId].push(p);
  });

  const optionsMap: Record<string, DatabasePropertyOption> = {};
  const customOptions: DatabasePropertyOption[] = [];

  statusProperty.options
    ?.filter((x) => x.id)
    .sort((dpa, dpb) => {
      const value_a = dpa.id ? actionEditIds.indexOf(dpa.id) : -1;
      const value_b = dpb.id ? actionEditIds.indexOf(dpb.id) : -1;

      if (value_a === -1) return 1;

      if (value_b === -1) return -1;

      if (value_a > value_b) return 1;

      if (value_a < value_b) return -1;

      return 0;
    })
    .forEach((option) => {
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
                icon={{ source: "./icon/kanban_status_started.png", tintColor: Color.PrimaryText }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onPageUpdated={onPageUpdated}
              />,
            ]}
            databaseView={databaseView}
            databaseProperties={databaseProperties}
            saveDatabaseView={saveDatabaseView}
            onPageUpdated={onPageUpdated}
            onPageCreated={onPageCreated}
          />
        ))}
      </List.Section>
    );
  });

  return SectionElement as unknown as JSX.Element;
}
