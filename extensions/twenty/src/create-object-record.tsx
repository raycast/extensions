import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { randomUUID } from "crypto";

import { DataModel } from "./services/zod/schema/dataModelSchema";
import twenty from "./services/TwentySDK";
import { ObjectIcons } from "./enum/icons";
import { OpenCreateObjectRecordForm } from "./pages";

export default function CreateObjectRecord() {
  const [activeDataModels, setActiveDataModels] = useState<DataModel | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { push } = useNavigation();

  useEffect(
    function () {
      async function onLoad() {
        const [activeDataModels] = await Promise.all([twenty.getActiveDataModels()]);
        setActiveDataModels(activeDataModels);
        setIsLoading(false);
      }

      if (activeDataModels) return;
      onLoad();
    },
    [isLoading],
  );

  const standardActiveModel = activeDataModels?.filter((model) => !model.isCustom);
  const customActiveModel = activeDataModels?.filter((model) => model.isCustom);

  return (
    <List isLoading={isLoading} navigationTitle="Create Object Record" searchBarPlaceholder="Search Object Record">
      <List.Section title="Standard Objects">
        {standardActiveModel?.map((model) => {
          const { id, description, labelPlural, icon } = model;
          return (
            <List.Item
              id={id}
              title={labelPlural}
              subtitle={description ?? ""}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Record"
                    icon={Icon.List}
                    onAction={async () => {
                      const objectRecordMetadata = await twenty.getRecordFieldsForDataModel(id);
                      push(OpenCreateObjectRecordForm({ objectRecordMetadata }));
                    }}
                  />
                </ActionPanel>
              }
              icon={icon ? (ObjectIcons[icon] ?? Icon.BulletPoints) : Icon.BulletPoints}
              key={randomUUID().toString()}
            />
          );
        })}
      </List.Section>
      <List.Section title="Custom Objects">
        {customActiveModel?.map((model) => {
          const { id, description, labelPlural } = model;
          return (
            <List.Item
              id={id}
              title={labelPlural}
              subtitle={description ?? ""}
              icon={Icon.BulletPoints}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Record"
                    icon={Icon.List}
                    onAction={async () => {
                      const objectRecordMetadata = await twenty.getRecordFieldsForDataModel(id);
                      push(OpenCreateObjectRecordForm({ objectRecordMetadata }));
                    }}
                  />
                </ActionPanel>
              }
              key={randomUUID().toString()}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
