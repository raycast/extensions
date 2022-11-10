import { Form, ActionPanel, Icon, showToast, useNavigation, Action, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { fetchDatabaseProperties, notionColorToTintColor, fetchDatabases } from "../../utils/notion";
import { DatabaseView, DatabaseProperty, DatabasePropertyOption } from "../../utils/types";
import { databasesAtom, databasePropertiesAtom } from "../../utils/state";

/**
 * A Form to determine how to display a Database
 */
export function DatabaseViewForm(props: {
  databaseId: string;
  databaseView?: DatabaseView;
  saveDatabaseView: (newDatabaseView: DatabaseView) => void;
  isDefaultView: boolean;
}): JSX.Element {
  const { databaseId: presetDatabaseId, databaseView, saveDatabaseView, isDefaultView } = props;

  const currentViewName = databaseView?.name ? databaseView.name : null;

  // On form submit function
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

    saveDatabaseView(newDatabaseView);

    showToast({
      title: "View Updated",
    });
    pop();
  }

  const [{ value: databases }, storeDatabases] = useAtom(databasesAtom);
  const [databaseId, setDatabaseId] = useState(presetDatabaseId);
  const [{ value: databaseProperties }, setDatabaseProperties] = useAtom(databasePropertiesAtom(databaseId));
  const [viewType, setViewType] = useState<"kanban" | "list">(databaseView?.type ? databaseView.type : "list");
  const [isLoadingDatabases, setIsLoadingDatadases] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch databases
  useEffect(() => {
    const fetchData = async () => {
      if (isDefaultView) {
        setIsLoadingDatadases(false);
        return;
      }

      const fetchedDatabases = await fetchDatabases();

      if (fetchedDatabases.length) {
        await storeDatabases(fetchedDatabases);
      }
      setIsLoadingDatadases(false);
    };
    fetchData();
  }, []);

  // Fetch selected database properties
  useEffect(() => {
    const fetchData = async () => {
      if (databaseId) {
        setIsLoading(true);

        const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);
        if (fetchedDatabaseProperties.length) {
          setDatabaseProperties(fetchedDatabaseProperties);
        }

        setIsLoading(false);
      }
    };
    fetchData();
  }, [databaseId]);

  // Set selected view form
  useEffect(() => {
    if (databaseProperties && viewType === "kanban") {
      const hasSelect = databaseProperties.some((dp) => dp.type === "select");

      if (!hasSelect) {
        showToast({
          style: Toast.Style.Failure,
          title: "Select Property Required",
          message: 'Kanban view requires a "Select" type property.',
        });
        setViewType("list");
      }
    }
  }, [databaseProperties, viewType]);

  return (
    <Form
      isLoading={isLoading || isLoadingDatabases}
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
            <Form.Dropdown key="view-database" id="database_id" title={"Database"} onChange={setDatabaseId}>
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
      {!isDefaultView ? (
        <Form.TextField
          key="view-name"
          id="name"
          title="View Name"
          defaultValue={currentViewName ? currentViewName : undefined}
          placeholder="My List View"
        />
      ) : null}
      <Form.Dropdown
        key="view-type"
        id="type"
        title="View Type"
        value={viewType}
        // @ts-expect-error string instead of 'list' | 'kanban'
        onChange={setViewType}
      >
        <Form.Dropdown.Item
          key="view-type-list"
          value="list"
          title="List"
          icon={{ source: "./icon/view_list.png", tintColor: Color.PrimaryText }}
        />
        <Form.Dropdown.Item
          key="view-type-kanban"
          value="kanban"
          title="Kanban"
          icon={{ source: "./icon/view_kanban.png", tintColor: Color.PrimaryText }}
        />
      </Form.Dropdown>
      <Form.Separator />
      {databaseProperties && viewType === "kanban" ? (
        <KanbanViewFormItem
          databaseView={databaseView}
          selectProperties={databaseProperties.filter((dp) => dp.type === "select")}
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

function KanbanViewFormItem(props: {
  selectProperties: DatabaseProperty[];
  databaseView?: DatabaseView;
}): JSX.Element | null {
  const { selectProperties, databaseView } = props;

  const [statusPropertyId, setStatusPropertyId] = useState<string | undefined>(
    databaseView?.kanban?.property_id ? databaseView?.kanban?.property_id : selectProperties[0]?.id
  );

  const statusProperty = selectProperties.find((dp) => dp.id === statusPropertyId);

  function getStatusState(statusProperty: DatabaseProperty | undefined) {
    if (statusProperty && statusProperty.options) {
      const currentConfig = databaseView?.kanban;

      const statusOptions = (statusProperty.options as DatabasePropertyOption[]).filter(
        (o) => o.id !== "_select_null_"
      );

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
  }

  const [statusState, setStatusState] = useState<{ [key: string]: string[] }>(
    getStatusState(statusProperty) || {
      backlog: [],
      not_started: [],
      started: [],
      completed: [],
      canceled: [],
    }
  );

  function updateStatusPropertyId(statusPropertyId: string) {
    setStatusPropertyId(statusPropertyId);
    const statusProperty = selectProperties.find((dp) => dp.id === statusPropertyId);
    const newStatusState = getStatusState(statusProperty);
    if (newStatusState) {
      setStatusState(newStatusState);
    }
  }

  return [
    <Form.Dropdown
      key="kanban-property-id"
      id="kanban::property_id"
      title="Kanban Status"
      value={statusPropertyId}
      onChange={updateStatusPropertyId}
    >
      {selectProperties.map((dp) => (
        <Form.Dropdown.Item
          key={`kanban-status-property-${dp.id}`}
          value={dp.id}
          title={dp.name ? dp.name : "Untitled"}
          icon={{ source: "./icon/select.png", tintColor: Color.PrimaryText }}
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
      : []
  ) as unknown as JSX.Element;
}

function StatusTagPicker(props: {
  id: string;
  title: string;
  value: string[];
  onChange: (newValue: string[]) => void;
  statusProperty: DatabaseProperty;
}): JSX.Element {
  const { id, title, statusProperty, value, onChange } = props;

  return (
    <Form.TagPicker
      id={`kanban::${id}_ids`}
      title={title + " →"}
      placeholder={`Status for "${title}" tasks`}
      value={value}
      onChange={onChange}
    >
      {(statusProperty?.options as DatabasePropertyOption[]).map((o) => {
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
