import { Action, ActionPanel, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";

import twenty from "./services/TwentySDK";
import { ObjectIcons } from "./enum/icons";
import { OpenCreateObjectRecordForm } from "./pages";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { DataModelItem } from "./services/zod/schema/dataModelSchema";

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

  // `isCustom` was removed from the metadata API in Twenty 2.12. Without it we
  // cannot tell standard and custom objects apart, so they share one section.
  const canSplitByCustom = activeDataModels?.some((model) => typeof model.isCustom === "boolean") ?? false;
  const standardActiveModel = canSplitByCustom
    ? activeDataModels?.filter((model) => !model.isCustom)
    : activeDataModels;
  const customActiveModel = canSplitByCustom ? activeDataModels?.filter((model) => model.isCustom) : [];

  function renderModel(model: DataModelItem) {
    const { id, description, labelPlural, icon } = model;

    return (
      <List.Item
        id={id}
        key={id}
        title={labelPlural}
        subtitle={description ?? ""}
        icon={icon ? (ObjectIcons[icon] ?? Icon.BulletPoints) : Icon.BulletPoints}
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
      />
    );
  }

  return (
    <List
      isLoading={isLoading || isOpenView}
      navigationTitle="Create Object Record"
      searchBarPlaceholder="Search Object Record"
    >
      <List.Section title={canSplitByCustom ? "Standard Objects" : "Objects"}>
        {standardActiveModel?.map(renderModel)}
      </List.Section>
      <List.Section title="Custom Objects">{customActiveModel?.map(renderModel)}</List.Section>
    </List>
  );
}
