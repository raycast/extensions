import { Form, ActionPanel, Icon, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { useDatabaseProperties, useDatabases } from "../../hooks";
import { notionColorToTintColor, DatabaseProperty, isType } from "../../utils/notion";
import { DatabaseView } from "../../utils/types";

export function DatabaseViewForm(props: {
  databaseId: string;
  databaseView?: DatabaseView;
  setDatabaseView: (databaseView: DatabaseView) => Promise<void>;
}) {
  const { databaseId: presetDatabaseId, databaseView, setDatabaseView } = props;

  const { pop } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    const newDatabaseView = {
      properties: databaseView?.properties ? databaseView.properties : {},
      sort_by: databaseView?.sort_by ? databaseView.sort_by : {},
      type: values.type ? values.type : "list",
      name: values.name ? values.name : null,
    } as DatabaseView;

    if (values.type === "kanban") {
      newDatabaseView.kanban = {
        property_id: values["kanban::property_id"],
        backlog_ids: values["kanban::backlog_ids"] ? values["kanban::backlog_ids"] : [],
        not_started_ids: values["kanban::not_started_ids"] ? values["kanban::not_started_ids"] : [],
        started_ids: values["kanban::started_ids"] ? values["kanban::started_ids"] : [],
        completed_ids: values["kanban::completed_ids"] ? values["kanban::completed_ids"] : [],
        canceled_ids: values["kanban::canceled_ids"] ? values["kanban::canceled_ids"] : [],
      };
    }

    setDatabaseView(newDatabaseView);

    pop();
  }

  const { data: databases, isLoading: isLoadingDatabases } = useDatabases();
  const [databaseId, setDatabaseId] = useState(presetDatabaseId);
  const [viewType, setViewType] = useState<"kanban" | "list">(databaseView?.type ? databaseView.type : "list");
  const { data: databaseProperties, isLoading: isLoadingDatabaseProperties } = useDatabaseProperties(databaseId);

  useEffect(() => {
    if (databaseProperties && viewType === "kanban") {
      const hasSelect = databaseProperties.some((dp) => dp.type === "select" || dp.type === "status");

      if (!hasSelect) {
        showToast({
          style: Toast.Style.Failure,
          title: "Select Property Required",
          message: 'Kanban view requires a "Select" or "Status" type property.',
        });
        setViewType("list");
      }
    }
  }, [databaseProperties, viewType]);

  return (
    <Form
      isLoading={isLoadingDatabaseProperties || isLoadingDatabases}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Save View" icon={Icon.Plus} onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!presetDatabaseId
        ? [
            <Form.Dropdown id="database_id" title={"Database"} onChange={setDatabaseId}>
              {databases?.map((d) => {
                return (
                  <Form.Dropdown.Item
                    key={d.id}
                    value={d.id}
                    title={d.title ? d.title : "Untitled"}
                    icon={
                      d.icon_emoji
                        ? d.icon_emoji
                        : d.icon_file
                          ? d.icon_file
                          : d.icon_external
                            ? d.icon_external
                            : Icon.List
                    }
                  />
                );
              })}
            </Form.Dropdown>,
            <Form.Separator key="separator" />,
          ]
        : null}
      <Form.Dropdown
        id="type"
        title="View Type"
        value={viewType}
        // @ts-expect-error string instead of 'list' | 'kanban'
        onChange={setViewType}
      >
        <Form.Dropdown.Item value="list" title="List" icon="./icon/view_list.png" />
        <Form.Dropdown.Item value="kanban" title="Kanban" icon="./icon/view_kanban.png" />
      </Form.Dropdown>
      <Form.Separator />
      {databaseProperties && viewType === "kanban" ? (
        <KanbanViewFormItem
          databaseView={databaseView}
          properties={databaseProperties.filter((dp): dp is StatusDatabaseProperty => isType(dp, "select", "status"))}
        />
      ) : null}
    </Form>
  );
}

const statusTypes: { [key: string]: string } = {
  backlog: "Backlog",
  not_started: "To Do",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

type StatusDatabaseProperty = Extract<DatabaseProperty, { type: "select" | "status" }>;
interface KanbanViewFormItemParams {
  properties: StatusDatabaseProperty[];
  databaseView?: DatabaseView;
}
function KanbanViewFormItem({ properties, databaseView }: KanbanViewFormItemParams) {
  const [statusPropertyId, setStatusPropertyId] = useState<string | undefined>(
    databaseView?.kanban?.property_id ? databaseView?.kanban?.property_id : properties[0]?.id,
  );

  const statusProperty = properties.find((dp) => dp.id === statusPropertyId);

  function getStatusState(property: DatabaseProperty | undefined) {
    if (!property || !isType(property, "status")) return;
    const statusOptions = property.config.options.filter((o) => o.id !== "_select_null_");
    const currentConfig = databaseView?.kanban;

    const defaultBacklogOpts = currentConfig ? currentConfig.backlog_ids : ["_select_null_"];
    const defaultCompletedOpts = currentConfig
      ? currentConfig.completed_ids
      : statusOptions[statusOptions.length - 1]?.id
        ? [statusOptions[statusOptions.length - 1].id!]
        : [];
    const defaultNotStartedOpts = currentConfig
      ? currentConfig.not_started_ids
      : statusOptions[0] && !defaultCompletedOpts.includes(statusOptions[0].id!)
        ? [statusOptions[0].id!]
        : [];
    const defaultStartedOpts = currentConfig
      ? currentConfig.started_ids
      : statusOptions
          .filter((o) => !defaultNotStartedOpts.includes(o.id!) && !defaultCompletedOpts.includes(o.id!))
          .map((o) => o.id!);
    const defaultCanceledOpts = currentConfig ? currentConfig.canceled_ids : [];

    return {
      backlog: defaultBacklogOpts,
      not_started: defaultNotStartedOpts,
      started: defaultStartedOpts,
      completed: defaultCompletedOpts,
      canceled: defaultCanceledOpts,
    };
  }

  const [statusState, setStatusState] = useState<{ [key: string]: string[] }>(
    getStatusState(statusProperty) || {
      backlog: [],
      not_started: [],
      started: [],
      completed: [],
      canceled: [],
    },
  );

  function updateStatusPropertyId(statusPropertyId: string) {
    setStatusPropertyId(statusPropertyId);
    const statusProperty = properties.find((dp) => dp.id === statusPropertyId);
    const newStatusState = getStatusState(statusProperty);
    if (newStatusState) {
      setStatusState(newStatusState);
    }
  }

  return [
    <Form.Dropdown
      id="kanban::property_id"
      title="Kanban Status"
      value={statusPropertyId}
      onChange={updateStatusPropertyId}
    >
      {properties.map((dp) => (
        <Form.Dropdown.Item
          key={`kanban-status-property-${dp.id}`}
          value={dp.id}
          title={dp.name ? dp.name : "Untitled"}
          icon={Icon.ArrowDownCircle}
        />
      ))}
    </Form.Dropdown>,
  ].concat(
    statusProperty
      ? Object.keys(statusTypes).map((statusTypeId) => (
          <StatusTagPicker
            key={`kanban-tag-picker-${statusTypeId}`}
            statusProperty={statusProperty}
            id={statusTypeId}
            title={statusTypes[statusTypeId]}
            value={statusState[statusTypeId]}
            onChange={(newValue: string[]) => setStatusState((x) => ({ ...x, [statusTypeId]: newValue }))}
          />
        ))
      : [],
  ) as unknown as JSX.Element;
}

function StatusTagPicker(props: {
  id: string;
  title: string;
  value: string[];
  onChange: (newValue: string[]) => void;
  statusProperty: StatusDatabaseProperty;
}) {
  const { id, title, statusProperty, value, onChange } = props;

  return (
    <Form.TagPicker
      id={`kanban::${id}_ids`}
      title={title + " →"}
      placeholder={`Status for "${title}" tasks`}
      value={value}
      onChange={onChange}
    >
      {statusProperty.config.options.map((o) => {
        if (!o.id) {
          return null;
        }
        return (
          <Form.TagPicker.Item
            key={`kanban-${id}-tag-${o.id}`}
            value={o.id}
            title={o.name}
            icon={{ source: `./icon/kanban_status_${id}.png`, tintColor: notionColorToTintColor(o.color) }}
          />
        );
      })}
    </Form.TagPicker>
  );
}
