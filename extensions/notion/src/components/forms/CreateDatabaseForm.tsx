import { ActionPanel, Icon, Detail, Form, showToast, useNavigation, Action, Image, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  fetchDatabases,
  fetchDatabaseProperties,
  queryDatabase,
  createDatabasePage,
  notionColorToTintColor,
  fetchUsers,
  pageIcon,
} from "../../utils/notion";
import { DatabaseProperty, DatabasePropertyOption, DatabaseView, Page } from "../../utils/types";
import { ActionSetVisibleProperties } from "../actions";
import { handleOnOpenPage } from "../../utils/openPage";
import {
  usersAtom,
  databasesAtom,
  databaseViewsAtom,
  databasePropertiesAtom,
  recentlyOpenedPagesAtom,
} from "../../utils/state";

export function CreateDatabaseForm(props: { databaseId?: string; onPageCreated?: (page: Page) => void }): JSX.Element {
  const { databaseId: presetDatabaseId, onPageCreated } = props;

  const [databaseId, setDatabaseId] = useState<string | null>(presetDatabaseId ? presetDatabaseId : null);
  const [{ value: databaseView }, setDatabaseView] = useAtom(databaseViewsAtom(databaseId || "__no_id__"));
  const [{ value: databaseProperties }, setDatabaseProperties] = useAtom(
    databasePropertiesAtom(databaseId || "__no_id__")
  );
  const [{ value: users }, storeUsers] = useAtom(usersAtom);
  const [{ value: databases }, storeDatabases] = useAtom(databasesAtom);
  const [{ value: recentlyOpenedPages }, storeRecentlyOpenedPage] = useAtom(recentlyOpenedPagesAtom);
  const [relationsPages, setRelationsPages] = useState<Record<string, Page[]>>(
    databaseProperties
      .filter((cdp) => cdp.type === "relation" && cdp.relation_id)
      .reduce((prev, cdp) => {
        prev[cdp.id] = recentlyOpenedPages.filter((x) => x.parent_database_id === cdp.relation_id);
        return prev;
      }, {} as Record<string, Page[]>)
  );
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // On form submit function
  const { pop } = useNavigation();
  async function handleSubmit(values: Form.Values, openPage: boolean) {
    if (!validateForm(values)) {
      return;
    }

    if (presetDatabaseId) values.database = presetDatabaseId;

    setIsLoading(true);
    const page = await createDatabasePage(values);
    setIsLoading(false);
    if (page) {
      onPageCreated?.(page);

      if (openPage) {
        handleOnOpenPage(page, storeRecentlyOpenedPage);
      }

      pop();
    }
  }

  // Fetch databases
  useEffect(() => {
    const fetchData = async () => {
      if (presetDatabaseId) {
        setIsLoadingDatabases(false);
        return;
      }

      const fetchedDatabases = await fetchDatabases();

      if (fetchedDatabases.length) {
        await storeDatabases(fetchedDatabases);
      }
      setIsLoadingDatabases(false);
    };
    fetchData();
  }, []);

  // Fetch selected database property
  useEffect(() => {
    const fetchData = async () => {
      if (databaseId) {
        setIsLoading(true);

        const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);
        if (fetchedDatabaseProperties.length) {
          await setDatabaseProperties(fetchedDatabaseProperties);
        }

        setIsLoading(false);
      }
    };
    fetchData();
  }, [databaseId, databaseView]);

  useEffect(() => {
    if (!databaseId) {
      return;
    }

    setIsLoading(true);

    // Fetch relation pages
    databaseProperties.forEach(async (cdp: DatabaseProperty) => {
      if (cdp.type === "relation" && cdp.relation_id) {
        const fetchedRelationPages = await queryDatabase(cdp.relation_id, undefined);
        if (fetchedRelationPages.length > 0) {
          setRelationsPages((relationsPages) => ({ ...relationsPages, [cdp.relation_id!]: fetchedRelationPages }));
        }
      }
    });

    // Fetch users
    if (databaseProperties.some((cdp) => cdp.type === "people")) {
      fetchUsers().then(storeUsers);
    }

    setIsLoading(false);
  }, [databaseProperties]);

  if (!isLoading && !isLoadingDatabases && !databases.length) {
    return <Detail markdown={`No databases`} />;
  }

  // Handle save new database view
  function saveDatabaseView(newDatabaseView: DatabaseView): void {
    if (!databaseId || !newDatabaseView) return;

    setDatabaseView(newDatabaseView);
    showToast({
      title: "View Updated",
    });
  }

  // Get Title Property
  const titleProperty = databaseProperties?.find((dp) => dp.id === "title");
  const databasePropertiesButTitle = databaseProperties?.filter((dp) => dp.id !== "title");
  return (
    <Form
      isLoading={isLoading || isLoadingDatabases}
      navigationTitle={presetDatabaseId ? " →  Create New Page" : "Create Database Page"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Create Page"
              icon={Icon.Plus}
              onSubmit={(values) => handleSubmit(values, false)}
            />
            <Action.SubmitForm
              title="Create and Open Page"
              icon={Icon.Plus}
              onSubmit={(values) => handleSubmit(values, true)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="View options">
            <ActionSetVisibleProperties
              key="set-visible-inputs"
              databaseProperties={databasePropertiesButTitle || []}
              selectedPropertiesIds={databaseView?.create_properties || databaseProperties.map((x) => x.id)}
              onSelect={(propertyId) => {
                const databaseViewCopy = (databaseView ? JSON.parse(JSON.stringify(databaseView)) : {}) as DatabaseView;
                if (!databaseViewCopy.create_properties) {
                  databaseViewCopy.create_properties = databaseProperties.map((x) => x.id);
                }
                databaseViewCopy.create_properties.push(propertyId);
                saveDatabaseView(databaseViewCopy);
              }}
              onUnselect={(propertyId) => {
                const databaseViewCopy = (databaseView ? JSON.parse(JSON.stringify(databaseView)) : {}) as DatabaseView;
                if (!databaseViewCopy.create_properties) {
                  databaseViewCopy.create_properties = databaseProperties.map((x) => x.id);
                }
                databaseViewCopy.create_properties = databaseViewCopy.create_properties.filter(
                  (pid) => pid !== propertyId
                );
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
                        : Icon.List
                    }
                  />
                );
              })}
            </Form.Dropdown>,
            <Form.Separator key="separator" />,
          ]
        : null}
      <Form.TextField
        id="property::title::title"
        title={titleProperty?.name ? titleProperty?.name : "Untitled"}
        placeholder="Title"
      />
      {databaseProperties
        ?.filter(
          (dp) =>
            dp.id !== "title" &&
            dp.type !== "title" &&
            (!databaseView?.create_properties || databaseView.create_properties.includes(dp.id))
        )
        .sort((dpa, dpb) => {
          if (!databaseView?.create_properties) {
            return 0;
          }
          const value_a = databaseView.create_properties.indexOf(dpa.id);
          const value_b = databaseView.create_properties.indexOf(dpb.id);
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
            case "checkbox":
              return <Form.Checkbox key={key} id={id} title={title} label={placeholder} />;
            case "select":
              return (
                <Form.Dropdown key={key} id={id} title={title}>
                  {(dp.options as DatabasePropertyOption[])?.map((opt) => {
                    if (!opt.id) {
                      return null;
                    }
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
            case "multi_select":
              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {(dp.options as DatabasePropertyOption[])?.map((opt) => {
                    if (!opt.id) {
                      return null;
                    }
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
            case "relation":
              if (!dp.relation_id) return null;

              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {relationsPages[dp.relation_id]?.map((rp: Page) => {
                    return (
                      <Form.TagPicker.Item
                        key={"relation::" + rp.id}
                        value={rp.id}
                        title={rp.title ? rp.title : "Untitled"}
                        icon={pageIcon(rp)}
                      />
                    );
                  })}
                </Form.TagPicker>
              );
            case "people":
              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {users?.map((u) => {
                    return (
                      <Form.TagPicker.Item
                        key={"people::" + u.id}
                        value={u.id}
                        title={u.name ? u.name : "Unknown"}
                        icon={u.avatar_url ? { source: u.avatar_url, mask: Image.Mask.Circle } : undefined}
                      />
                    );
                  })}
                </Form.TagPicker>
              );
            default:
              return <Form.TextField key={key} id={id} title={title} placeholder={placeholder} />;
          }
        })}
      <Form.Separator key="separator" />
      <Form.TextArea id="content" title="Page Content" />
      <Form.Description
        text={`Parses Markdown content into Notion Blocks.
- Supports all heading types (heading depths 4, 5, 6 are treated as 3 for Notion)
- Supports numbered lists, bulleted lists, to-do lists
- Supports italics, bold, strikethrough, inline code, hyperlinks
- Code blocks
- Block quotes

Per Notion limitations, these markdown attributes are not supported:
- Tables (removed)
- HTML tags (removed)
- Thematic breaks (removed)`}
      />
    </Form>
  );
}

function validateForm(values: Form.Values): boolean {
  const valueKeys = Object.keys(values) as string[];
  const titleKey = valueKeys.find((vk) => vk.includes("property::title"));
  if (!titleKey || !values[titleKey]) {
    showToast({
      style: Toast.Style.Failure,
      title: "Title Required",
      message: "Please set title value",
    });
    return false;
  }
  return true;
}
