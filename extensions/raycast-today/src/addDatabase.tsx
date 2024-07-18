import React from "react";
import { DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { FormValidation, useForm, withAccessToken } from "@raycast/utils";
import { filter, find } from "lodash";
import { useStore } from "@today/common/components/StoreContext";
import { useSearch } from "@today/common/hooks/useSearch";

import { notionService } from "./utils/authNotion";
import Success from "./components/Success";
import { withStoreProvider } from "./components/StoreProvider";
import { Store } from "@today/common/types";

const normalizeImage = (icon: DatabaseObjectResponse["icon"]): string => {
  if (icon?.type === "emoji") {
    return icon.emoji;
  }

  if (icon?.type === "external") {
    return icon.external?.url;
  }

  return "";
};

const getPropertyType = (
  type: DatabaseObjectResponse["properties"][keyof DatabaseObjectResponse["properties"]]["type"],
  properties?: DatabaseObjectResponse["properties"],
) => filter(Object.values(properties || []), { type: type });

const AddDatabase = () => {
  const { setItem } = useStore();
  const { data: databases, isLoading, getDatabase } = useSearch();
  const { push } = useNavigation();
  const [databaseId, setDatabaseId] = React.useState<string>("");
  const [databaseError, setDatabaseError] = React.useState(false);

  const { handleSubmit, values, setValue } = useForm<Omit<Store["config"][keyof Store["config"]], "databaseId">>({
    async onSubmit(values) {
      setItem("config", (prev) => ({
        ...prev,
        [databaseId]: {
          ...values,
          databaseId,
        },
      }));
      push(<Success />);
    },
    validation: {
      titleId: FormValidation.Required,
      dateId: FormValidation.Required,
      statusId: FormValidation.Required,
      peopleId: FormValidation.Required,
    },
    initialValues: {
      titleId: "",
      dateId: "",
      statusId: "",
      peopleId: "",
    },
  });

  const onFormChange = React.useCallback(
    (key: keyof typeof values) => (value: string) => {
      setValue(key, value);
    },
    [setValue],
  );

  const database = React.useMemo(() => find(databases, { id: databaseId }), [databases, databaseId]);

  React.useEffect(() => {
    if (!database) return;

    setValue("titleId", find(Object.values(database.properties), { type: "title" })?.id || "");
    setValue("statusId", find(Object.values(database.properties), { type: "status" })?.id || "");
    setValue("peopleId", find(Object.values(database.properties), { type: "people" })?.id || "");
    setValue("dateId", find(Object.values(database.properties), { type: "date" })?.id || "");
  }, [database, setValue]);

  const onDatabaseChange = React.useCallback(
    async (databaseId: string) => {
      if (!databaseId) {
        setDatabaseId(databaseId);
        return;
      }

      let formattedDatabaseId = databaseId;

      if (formattedDatabaseId.startsWith("https")) {
        const regex = /.*\/(?<databaseId>.*?)(\?|$)/;

        const match = databaseId.match(regex);

        if (match && match.groups) {
          formattedDatabaseId = match.groups.databaseId;
        }
      }

      if (!formattedDatabaseId.includes("-")) {
        formattedDatabaseId = [
          formattedDatabaseId.slice(0, 8),
          formattedDatabaseId.slice(8, 12),
          formattedDatabaseId.slice(12, 16),
          formattedDatabaseId.slice(16, 20),
          formattedDatabaseId.slice(20),
        ].join("-");
      }

      setDatabaseError(false);
      setDatabaseId(formattedDatabaseId);

      if (find(databases, { id: formattedDatabaseId })) {
        return;
      }

      try {
        await getDatabase(formattedDatabaseId);
      } catch (error) {
        setDatabaseError(true);
      }
    },
    [getDatabase, databases],
  );

  const displayEmptyDatabase = databaseError || isLoading;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="database"
        title="Database"
        value={displayEmptyDatabase || !database?.id ? "" : database?.id}
        onChange={onDatabaseChange}
        info="Select a database (if you can't find it, paste its link below)"
        isLoading={isLoading}
      >
        {displayEmptyDatabase && <Form.Dropdown.Item value="" title={"-"} />}
        {databases?.map((item) => (
          <Form.Dropdown.Item
            key={item.id}
            value={item.id}
            title={item.title[0]?.plain_text || "Untitled"}
            icon={normalizeImage(item.icon)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="databaseId"
        title="Database Id"
        value={databaseId}
        onChange={onDatabaseChange}
        info="The id of the database (you can simply paste the url of the database)"
        error={databaseError ? "Database not found" : undefined}
      />
      <Form.Description text="Task databases require status, assignee, and due date properties." />
      <Form.Dropdown
        title="Title"
        id="titleId"
        value={values.titleId}
        onChange={onFormChange("titleId")}
        error={!values.titleId && !isLoading && databaseId ? "Required" : undefined}
        info="Pick the property that represents the title"
        storeValue
      >
        {getPropertyType("title", database?.properties).map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Status"
        id="statusId"
        value={values.statusId}
        onChange={onFormChange("statusId")}
        error={!values.statusId && !isLoading && databaseId ? "Required" : undefined}
        info="Pick the property that represents the status"
        storeValue
      >
        {getPropertyType("status", database?.properties).map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Assignee"
        id="peopleId"
        value={values.peopleId}
        onChange={onFormChange("peopleId")}
        error={!values.peopleId && !isLoading && databaseId ? "Required" : undefined}
        info="Pick the property that represents the assignee"
        storeValue
      >
        {getPropertyType("people", database?.properties).map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Date"
        id="dateId"
        value={values.dateId}
        onChange={onFormChange("dateId")}
        error={!values.dateId && !isLoading && databaseId ? "Required" : undefined}
        info="Pick the property that represents the date "
        storeValue
      >
        {getPropertyType("date", database?.properties).map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

export default withStoreProvider(withAccessToken(notionService)(AddDatabase));
