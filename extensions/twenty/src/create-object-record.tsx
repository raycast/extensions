import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";

import twenty from "./services/TwentySDK";
import { ObjectIcons } from "./enum/icons";
import { OpenCreateObjectRecordForm } from "./pages";
import { usePromise } from "@raycast/utils";

export default function CreateObjectRecord() {
  const { isLoading, data: activeDataModels } = usePromise(async () => {
    const activeDataModels = await twenty.getActiveDataModels();
    return activeDataModels;
  });

  const { push } = useNavigation();

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
