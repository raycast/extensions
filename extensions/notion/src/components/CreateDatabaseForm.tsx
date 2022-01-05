import {
  ActionPanel,
  SubmitFormAction,
  Icon,
  Detail,
  Form,
  FormValues,
  showToast,
  ToastStyle,
  ImageMask,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Database,
  DatabaseProperty,
  DatabasePropertyOption,
  DatabaseView,
  User,
  Page,
  fetchDatabases,
  fetchDatabaseProperties,
  queryDatabase,
  createDatabasePage,
  fetchExtensionReadMe,
  notionColorToTintColor,
  fetchUsers,
} from "../utils/notion";
import { ActionSetVisibleProperties } from "./";
import {
  storeDatabases,
  loadDatabases,
  storeDatabaseProperties,
  loadDatabaseProperties,
  storeDatabasePages,
  loadDatabasePages,
  storeUsers,
  loadUsers,
  storeDatabaseView,
  loadDatabaseView,
} from "../utils/local-storage";

export function CreateDatabaseForm(props: { databaseId?: string; setRefreshView?: any }): JSX.Element {
  const presetDatabaseId = props.databaseId;
  const setParentRefreshView = props.setRefreshView;

  // On form submit function
  const { pop } = useNavigation();
  async function handleSubmit(values: FormValues) {
    if (!validateForm(values)) {
      return;
    }

    if (presetDatabaseId) values.database = presetDatabaseId;

    setIsLoading(true);
    const page = await createDatabasePage(values);
    setIsLoading(false);
    if (!page) {
      showToast(ToastStyle.Failure, "Couldn't create database page");
    } else {
      showToast(ToastStyle.Success, "Page created!");
      if (setParentRefreshView) setParentRefreshView(Date.now());

      pop();
    }
  }

  // Setup useState objects
  const [databases, setDatabases] = useState<Database[]>();
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>();
  const [databaseId, setDatabaseId] = useState<string | null>(presetDatabaseId ? presetDatabaseId : null);
  const [databaseView, setDatabaseView] = useState<DatabaseView>();
  const [refreshView, setRefreshView] = useState<number>();
  const [markdown, setMarkdown] = useState<string>();
  const [relationsPages, setRelationsPages] = useState<Record<string, Page[]>>({});
  const [users, setUsers] = useState<User[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Currently supported properties
  const supportedPropTypes = [
    "title",
    "rich_text",
    "number",
    "url",
    "email",
    "phone_number",
    "date",
    "checkbox",
    "select",
    "multi_select",
    "relation",
    "people",
  ];

  // Fetch databases
  useEffect(() => {
    const fetchData = async () => {
      if (presetDatabaseId) {
        setDatabaseId(presetDatabaseId);
        return;
      }

      const cachedDatabases = await loadDatabases();

      if (cachedDatabases) {
        setDatabases(cachedDatabases);
      }

      const fetchedDatabases = await fetchDatabases();

      setIsLoading(false);

      if (fetchedDatabases) {
        setDatabases(fetchedDatabases);
        storeDatabases(fetchedDatabases);
      }
    };
    fetchData();
  }, []);

  // Fetch selected database property
  useEffect(() => {
    const fetchData = async () => {
      if (databaseId) {
        setIsLoading(true);

        const cachedDatabaseProperties = await loadDatabaseProperties(databaseId);

        if (cachedDatabaseProperties) {
          setDatabaseProperties(cachedDatabaseProperties);

          // Load realtion page
          cachedDatabaseProperties.forEach(async function (cdp: DatabaseProperty) {
            if (cdp.type === "relation" && cdp.relation_id && !relationsPages[cdp.relation_id]) {
              const cachedRelationPages = await loadDatabasePages(databaseId);
              if (cachedRelationPages) {
                const copyRelationsPages = JSON.parse(JSON.stringify(relationsPages));
                copyRelationsPages[cdp.relation_id] = cachedRelationPages;
                setRelationsPages(copyRelationsPages);
              }
            }
          });

          // Load users
          const hasPeopleProperty = cachedDatabaseProperties.some(function (cdp: DatabaseProperty) {
            return cdp.type === "people";
          });
          if (hasPeopleProperty) {
            const cachedUsers = await loadUsers();
            if (cachedUsers) {
              setUsers(cachedUsers);
            }
          }
        }

        const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);
        if (fetchedDatabaseProperties) {
          const supportedDatabaseProperties = fetchedDatabaseProperties.filter(function (property) {
            return supportedPropTypes.includes(property.type);
          });
          setDatabaseProperties(supportedDatabaseProperties);

          // Fetch relation pages
          supportedDatabaseProperties.forEach(async function (cdp: DatabaseProperty) {
            if (cdp.type === "relation" && cdp.relation_id) {
              const fetchedRelationPages = await queryDatabase(cdp.relation_id, undefined);
              if (fetchedRelationPages && fetchedRelationPages[0]) {
                const copyRelationsPages = JSON.parse(JSON.stringify(relationsPages));
                copyRelationsPages[cdp.relation_id] = fetchedRelationPages;
                setRelationsPages(copyRelationsPages);
                storeDatabasePages(cdp.relation_id, fetchedRelationPages);
              }
            }
          });

          // Fetch users
          const hasPeopleProperty = cachedDatabaseProperties.some(function (cdp: DatabaseProperty) {
            return cdp.type === "people";
          });
          if (hasPeopleProperty) {
            const fetchedUsers = await fetchUsers();
            if (fetchedUsers) {
              setUsers(fetchedUsers);
              await storeUsers(fetchedUsers);
            }
          }

          await storeDatabaseProperties(databaseId, supportedDatabaseProperties);
        }

        setIsLoading(false);
      }
    };
    fetchData();
  }, [databaseId, refreshView]);

  // Load database view
  useEffect(() => {
    const getDatabaseView = async () => {
      if (!databaseId) return;

      const loadedDatabaseView = await loadDatabaseView(databaseId);
      const loadedDatabaseViewCopy = loadedDatabaseView ? JSON.parse(JSON.stringify(loadedDatabaseView)) : {};

      if (loadedDatabaseView.create_properties) {
        setDatabaseView(loadedDatabaseViewCopy);
      } else {
        loadedDatabaseViewCopy.create_properties = [];
        databaseProperties?.forEach(function (dp) {
          loadedDatabaseViewCopy.create_properties.push(dp.id);
        });
        setDatabaseView(loadedDatabaseViewCopy);
      }
    };
    getDatabaseView();
  }, [databaseProperties]);

  // Fetch Notion Extension README
  useEffect(() => {
    const fetchREADME = async () => {
      if (!markdown) {
        const fetchedREADME = await fetchExtensionReadMe();
        setMarkdown(fetchedREADME);
      }
    };
    fetchREADME();
  }, []);

  if (databases && !databases[0] && markdown) {
    return <Detail markdown={markdown} />;
  }

  // Set visible inputs
  const databaseViewCopy = databaseView ? JSON.parse(JSON.stringify(databaseView)) : {};

  // Handle save new database view
  function saveDatabaseView(newDatabaseView: DatabaseView): void {
    if (!databaseId || !newDatabaseView) return;

    setDatabaseView(newDatabaseView);
    setRefreshView(Date.now());
    showToast(ToastStyle.Success, "View Updated");
    storeDatabaseView(databaseId, newDatabaseView);
  }

  // Get Title Property
  const titleProperty = databaseProperties?.filter(function (dp) {
    return dp.id === "title";
  })[0];
  const databasePropertiesButTitle = databaseProperties?.filter(function (dp) {
    return dp.id !== "title";
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle={presetDatabaseId ? " →  Create New Page" : "Create Database Page"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <SubmitFormAction title="Create Page" icon={Icon.Plus} onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section title="View options">
            <ActionSetVisibleProperties
              key="set-visible-inputs"
              databaseProperties={databasePropertiesButTitle ? databasePropertiesButTitle : []}
              selectedPropertiesIds={databaseView?.create_properties}
              onSelect={function (propertyId: string) {
                databaseViewCopy.create_properties.push(propertyId);
                saveDatabaseView(databaseViewCopy);
              }}
              onUnselect={function (propertyId: string) {
                const newVisiblePropertiesIds = databaseViewCopy?.create_properties.filter(function (pid: string) {
                  return pid !== propertyId;
                });
                databaseViewCopy.create_properties = newVisiblePropertiesIds ? newVisiblePropertiesIds : [];
                saveDatabaseView(databaseViewCopy);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!presetDatabaseId
        ? [
            <Form.Dropdown key="database" id="database" title={"Database"} onChange={setDatabaseId} storeValue>
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
                        : Icon.TextDocument
                    }
                  />
                );
              })}
            </Form.Dropdown>,
            <Form.Separator />,
          ]
        : null}
      <Form.TextField
        key="property::title::title"
        id="property::title::title"
        title={titleProperty?.name ? titleProperty?.name : "Untitled"}
        placeholder="Title"
      />
      {databaseProperties
        ?.filter(function (dp) {
          return dp?.id !== "title" && databaseView?.create_properties?.includes(dp?.id);
        })
        .sort(function (dpa, dpb) {
          const value_a = databaseView?.create_properties?.indexOf(dpa?.id);
          const value_b = databaseView?.create_properties?.indexOf(dpb?.id);

          if (!value_a || value_a === -1) return 1;

          if (!value_b || value_b === -1) return -1;

          if (value_a > value_b) return 1;

          if (value_a < value_b) return -1;

          return 0;
        })
        .map((dp) => {
          const key = "property::" + dp.type + "::" + dp.id;
          const id = key;
          const title = dp.name;

          let placeholder = dp.type.replace(/_/g, " ");
          placeholder = placeholder.charAt(0).toUpperCase() + placeholder.slice(1);

          switch (dp.type) {
            case "date":
              return <Form.DatePicker key={key} id={id} title={title} />;
              break;
            case "checkbox":
              return <Form.Checkbox key={key} id={id} title={title} label={placeholder} />;
              break;
            case "select":
              return (
                <Form.Dropdown key={key} id={id} title={title}>
                  {(dp.options as DatabasePropertyOption[])?.map((opt) => {
                    return (
                      <Form.Dropdown.Item
                        key={"option::" + opt.id}
                        value={opt.id}
                        title={opt.name ? opt.name : "Untitled"}
                        icon={
                          opt.color ? { source: Icon.Dot, tintColor: notionColorToTintColor(opt.color) } : undefined
                        }
                      />
                    );
                  })}
                </Form.Dropdown>
              );
              break;
            case "multi_select":
              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {(dp.options as DatabasePropertyOption[])?.map((opt) => {
                    return (
                      <Form.TagPicker.Item
                        key={"option::" + opt.id}
                        value={opt.id}
                        title={opt.name ? opt.name : "Untitled"}
                        icon={
                          opt.color ? { source: Icon.Dot, tintColor: notionColorToTintColor(opt.color) } : undefined
                        }
                      />
                    );
                  })}
                </Form.TagPicker>
              );
              break;
            case "relation":
              if (!dp.relation_id) return;

              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {relationsPages[dp.relation_id]?.map((rp: Page) => {
                    return (
                      <Form.TagPicker.Item
                        key={"relation::" + rp.id}
                        value={rp.id}
                        title={rp.title ? rp.title : "Untitled"}
                        icon={{
                          source: rp.icon_emoji
                            ? rp.icon_emoji
                            : rp.icon_file
                            ? rp.icon_file
                            : rp.icon_external
                            ? rp.icon_external
                            : Icon.TextDocument,
                        }}
                      />
                    );
                  })}
                </Form.TagPicker>
              );
              break;
            case "people":
              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {users?.map((u) => {
                    return (
                      <Form.TagPicker.Item
                        key={"people::" + u.id}
                        value={u.id}
                        title={u.name ? u.name : "Unknown"}
                        icon={u.avatar_url ? { source: u.avatar_url, mask: ImageMask.Circle } : undefined}
                      />
                    );
                  })}
                </Form.TagPicker>
              );
              break;
            default:
              return <Form.TextField key={key} id={id} title={title} placeholder={placeholder} />;
          }
        })}
    </Form>
  );
}

function validateForm(values: FormValues): boolean {
  const valueKeys = Object.keys(values) as string[];
  const titleKey = valueKeys.filter(function (vk) {
    return vk.includes("property::title");
  })[0];
  if (!values[titleKey]) {
    showToast(ToastStyle.Failure, "Title Required", "Please set title value");
    return false;
  }
  return true;
}
