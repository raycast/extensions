import { Action, ActionPanel, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";

import twenty from "./services/TwentySDK";
import { ObjectIcons } from "./enum/icons";
import { OpenCreateObjectRecordForm } from "./pages";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

export default function CreateObjectRecord() {
  const {
    isLoading,
    data: activeDataModels,
    error,
  } = usePromise(async () => {
    const activeDataModels = await twenty.getActiveDataModels();

    if (typeof activeDataModels === "string") {
      throw new Error(activeDataModels as string);
    }

    return activeDataModels;
  });

  const [isOpenView, setIsOpenView] = useState(false);
  const { push } = useNavigation();

  if (error) {
    return <Detail markdown={` # ERROR \n\n ${error.message}`} />;
  }

  const standardActiveModel = activeDataModels?.filter((model) => !model.isCustom);
  const customActiveModel = activeDataModels?.filter((model) => model.isCustom);

  return (
    <List
      isLoading={isLoading || isOpenView}
      navigationTitle="Create Object Record"
      searchBarPlaceholder="Search Object Record"
    >
      <List.Section title="Standard Objects">
        {standardActiveModel?.map((model) => {
          const { id, description, labelPlural, icon } = model;
          return (
            <List.Item
              id={id}
              title={labelPlural}
              subtitle={description ?? ""}
              actions={
                !isOpenView ? (
                  <ActionPanel>
                    <Action
                      title="Create Record"
                      icon={Icon.List}
                      onAction={async () => {
                        try {
                          setIsOpenView(true);
                          const objectRecordMetadata = await twenty.getRecordFieldsForDataModel(id);
                          if (typeof objectRecordMetadata === "string") {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: objectRecordMetadata,
                            });
                          } else {
                            push(OpenCreateObjectRecordForm({ objectRecordMetadata }));
                          }
                        } finally {
                          setIsOpenView(false);
                        }
                      }}
                    />
                  </ActionPanel>
                ) : (
                  <></>
                )
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
                !isOpenView ? (
                  <ActionPanel>
                    <Action
                      title="Create Record"
                      icon={Icon.List}
                      onAction={async () => {
                        try {
                          setIsOpenView(true);
                          const objectRecordMetadata = await twenty.getRecordFieldsForDataModel(id);
                          if (typeof objectRecordMetadata === "string") {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: objectRecordMetadata,
                            });
                          } else {
                            push(OpenCreateObjectRecordForm({ objectRecordMetadata }));
                          }
                        } finally {
                          setIsOpenView(false);
                        }
                      }}
                    />
                  </ActionPanel>
                ) : (
                  <></>
                )
              }
              key={randomUUID().toString()}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
