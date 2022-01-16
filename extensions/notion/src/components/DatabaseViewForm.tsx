import {
  Form,
  SubmitFormAction,
  ActionPanel,
  FormValues,
  Icon,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Database,
  DatabaseView,
  DatabaseProperty,
  DatabasePropertyOption,
  fetchDatabaseProperties,
  notionColorToTintColor,
  fetchDatabases,
} from "../utils/notion";
import { storeDatabases, loadDatabases, storeDatabaseProperties, loadDatabaseProperties } from "../utils/local-storage";

export function DatabaseViewForm(props: {
  databaseId: string;
  databaseView?: DatabaseView;
  saveDatabaseView: (newDatabaseView: DatabaseView) => void;
  isDefaultView: boolean;
}): JSX.Element {
  const presetDatabaseId = props.databaseId;
  const databaseView = props.databaseView;
  const saveDatabaseView = props.saveDatabaseView;
  const isDefaultView = props.isDefaultView;

  const currentViewName = databaseView?.name ? databaseView.name : null;
  const currentViewType = databaseView?.type ? databaseView.type : null;

  // On form submit function
  const { pop } = useNavigation();
  async function handleSubmit(values: FormValues) {
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

    showToast(ToastStyle.Success, "View Updated");
    pop();
  }

  // Setup useState objects
  const [databases, setDatabases] = useState<Database[]>();
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>();
  const [databaseId, setDatabaseId] = useState<string>();
  const [viewType, setViewType] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewForm, setViewForm] = useState<JSX.Element>();

  // Fetch databases
  useEffect(() => {
    const fetchData = async () => {
      if (presetDatabaseId) {
        setDatabaseId(presetDatabaseId);
      }

      if (isDefaultView) return;

      const cachedDatabases = await loadDatabases();

      if (cachedDatabases) {
        setDatabases(cachedDatabases);
      }

      const fetchedDatabases = await fetchDatabases();

      if (fetchedDatabases) {
        setDatabases(fetchedDatabases);
        setIsLoading(false);

        storeDatabases(fetchedDatabases);
      }
    };
    fetchData();
  }, []);

  // Fetch selected database properties
  useEffect(() => {
    const fetchData = async () => {
      if (databaseId) {
        setIsLoading(true);

        const cachedDatabaseProperties = await loadDatabaseProperties(databaseId);

        if (cachedDatabaseProperties) {
          setDatabaseProperties(cachedDatabaseProperties);
        }

        const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);
        if (fetchedDatabaseProperties) {
          setDatabaseProperties(fetchedDatabaseProperties);
          storeDatabaseProperties(databaseId, fetchedDatabaseProperties);
        }

        setIsLoading(false);
      }
    };
    fetchData();
  }, [databaseId]);

  // Set selected view form
  useEffect(() => {
    const fetchData = async () => {
      if (databaseProperties) {
        const hasSelect = databaseProperties.some(function (dp) {
          return dp.type === "select";
        });

        switch (viewType) {
          case "kanban":
            if (!hasSelect) {
              showToast(
                ToastStyle.Failure,
                "Select Property Required",
                'Kanban view requires a "Select" type property.'
              );
              setViewForm(undefined);
            }

            setViewForm(
              <KanbanViewFormItem
                key={`${databaseId}-kanban-view-form`}
                databaseView={databaseView}
                selectProperties={databaseProperties.filter(function (dp) {
                  return dp.type === "select";
                })}
              />
            );
            break;

          default:
            setViewForm(undefined);
        }
      }
    };
    fetchData();
  }, [databaseProperties, viewType]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <SubmitFormAction title="Save View" icon={Icon.Plus} onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!presetDatabaseId
        ? [
            <Form.Dropdown key="view-database" id="database_id" title={"Database"} onChange={setDatabaseId}>
              {databases?.map((d: Database) => {
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
                        : Icon.TextDocument
                    }
                  />
                );
              })}
            </Form.Dropdown>,
            <Form.Separator />,
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
        defaultValue={currentViewType ? currentViewType : undefined}
        onChange={setViewType}
      >
        <Form.Dropdown.Item key="view-type-list" value="list" title="List" icon="./icon/view_list.png" />
        <Form.Dropdown.Item key="view-type-kanban" value="kanban" title="Kanban" icon="./icon/view_kanban.png" />
      </Form.Dropdown>
      <Form.Separator />
      {viewForm ? viewForm : null}
    </Form>
  );
}

function KanbanViewFormItem(props: {
  selectProperties: DatabaseProperty[];
  databaseView?: DatabaseView;
}): JSX.Element | null {
  const selectProperties = props.selectProperties;
  const databaseView = props.databaseView;

  if (!selectProperties) return null;

  const defaultPropertyId = databaseView?.kanban?.property_id
    ? databaseView?.kanban?.property_id
    : selectProperties[0]?.id;

  // Setup useState objects
  const [statusProperty, setStatusProperty] = useState<DatabaseProperty>();
  const [FormItem, setFormItem] = useState<JSX.Element[]>([]);

  function onPropertyChange(propertyId: string) {
    if (!propertyId) return;

    const property = selectProperties?.filter(function (dp) {
      return dp.id === propertyId;
    })[0];

    if (!property) return;

    setStatusProperty(property);
  }

  // Set form item
  useEffect(() => {
    const presetForm = () => {
      if (statusProperty && statusProperty.options) {
        const currentConfig = databaseView?.kanban;
        const statusOptions = (statusProperty.options as DatabasePropertyOption[]).filter(function (o) {
          return o.id !== "_select_null_";
        });
        const propertyId = statusProperty.id;

        const defaultBacklogOpts = currentConfig ? currentConfig.backlog_ids : ["_select_null_"];
        const defaultCompletedOpts = currentConfig
          ? currentConfig.completed_ids
          : statusOptions[statusOptions.length - 1]
          ? [statusOptions[statusOptions.length - 1].id]
          : [];
        const defaultNotStartedOpts = currentConfig
          ? currentConfig.not_started_ids
          : statusOptions[0] && !defaultCompletedOpts.includes(statusOptions[0].id)
          ? [statusOptions[0].id]
          : [];
        const defaultStartedOpts = currentConfig
          ? currentConfig.started_ids
          : statusOptions
              .filter(function (o) {
                return !defaultNotStartedOpts.includes(o.id) && !defaultCompletedOpts.includes(o.id);
              })
              .map(function (o) {
                return o.id;
              });
        const defaultCanceledOpts = currentConfig ? currentConfig.canceled_ids : [];

        const statusTypes = [
          { id: "backlog", title: "Backlog", defaultValue: defaultBacklogOpts },
          { id: "not_started", title: "To Do", defaultValue: defaultNotStartedOpts },
          { id: "started", title: "In Progress", defaultValue: defaultStartedOpts },
          { id: "completed", title: "Completed", defaultValue: defaultCompletedOpts },
          { id: "canceled", title: "Canceled", defaultValue: defaultCanceledOpts },
        ];
        const tempFormItem: JSX.Element[] = [];
        statusTypes.forEach(function (statusType) {
          tempFormItem.push(
            <StatusTagPicker
              key={`kanban-tag-picker-${propertyId}-${statusType.id}`}
              statusProperty={statusProperty}
              propertyId={propertyId}
              id={statusType.id}
              title={statusType.title}
              // #TODO: Once TagPicker fixed
              //defaultValue={statusType.defaultValue}
            />
          );
        });
        setFormItem(tempFormItem);
      }
    };
    presetForm();
  }, [statusProperty]);

  return [
    <Form.Dropdown
      key="kanban-property-id"
      id="kanban::property_id"
      title="Kanban Status"
      // TODO once TagPicker fixed:defaultValue={defaultPropertyId}
      onChange={onPropertyChange}
    >
      {selectProperties?.map(function (dp) {
        return (
          <Form.Dropdown.Item
            key={`kanban-status-property-${dp.id}`}
            value={dp.id}
            title={dp.name ? dp.name : "Untitled"}
            icon={"./icon/select.png"}
          />
        );
      })}
    </Form.Dropdown>,
  ].concat(FormItem) as unknown as JSX.Element;
}

function StatusTagPicker(props: {
  id: string;
  title: string;
  defaultValue?: string[];
  propertyId: string;
  statusProperty: DatabaseProperty;
}): JSX.Element {
  const id = props.id;
  const title = props.title;
  const statusProperty = props.statusProperty;
  const propertyId = props.propertyId;

  // #TODO: Once TagPicker fixed
  //const defaultValue = props.defaultValue
  //const [defaultValueInit, setDefaultValueInit] = useState<string[] | undefined>((defaultValue ? defaultValue : undefined));
  //function onFirstChange(newValues: string[]) {
  //  setDefaultValueInit(undefined)
  //}

  // #TODO: Once TagPicker fixed, add :
  //onChange={( defaultValueInit !== null ? onFirstChange : undefined)}
  //value={defaultValueInit}
  //defaultValue={defaultValue}

  return (
    <Form.TagPicker
      key={`kanban-${propertyId}-${id}-tags`}
      id={`kanban::${id}_ids`}
      title={title + " →"}
      placeholder={`Status for "${title}" tasks`}
    >
      {(statusProperty?.options as DatabasePropertyOption[]).map((o) => {
        if (!o.id) {
          return null;
        }
        return (
          <Form.TagPicker.Item
            key={`kanban-${propertyId}-${id}-tag-${o.id}`}
            value={o.id}
            title={o.name}
            icon={{ source: `./icon/kanban_status_${id}.png`, tintColor: notionColorToTintColor(o.color) }}
          />
        );
      })}
    </Form.TagPicker>
  );
}
