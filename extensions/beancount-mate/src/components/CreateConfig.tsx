import React from "react";
import { Action, ActionPanel, Detail, environment, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fs from "fs-extra";
import { costflowConfigFilePath } from "../utils/preferences";
import { wrapToast } from "../utils/wrapToast";

const createDefaultCostflowConfig = wrapToast(
  (content: string) => fs.outputJson(costflowConfigFilePath, content, { spaces: 2 }),
  "Creating...",
  "Costflow config file created",
  "Failed to create Costflow config file"
);

const CreateConfig: React.FC<{ revalidate: () => Promise<boolean> }> = ({ revalidate }) => {
  const { isLoading, data } = useCachedPromise(() => fs.readJson(`${environment.assetsPath}/defaultCostFlow.json`));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Create Costflow Config"
      actions={
        <ActionPanel title="Beancount Meta">
          <Action
            title="Create Costflow Config"
            icon={Icon.NewDocument}
            onAction={() => createDefaultCostflowConfig(data).then(revalidate)}
          />
          <Action.Push
            title="Show Default Costflow Config"
            icon={Icon.Code}
            target={
              <Detail
                navigationTitle="Default Costflow Config"
                markdown={"```json\n" + JSON.stringify(data, null, 2) + "\n```"}
                actions={
                  <ActionPanel>
                    <Action
                      title="Create Costflow Config"
                      icon={Icon.NewDocument}
                      onAction={() => createDefaultCostflowConfig(data).then(revalidate)}
                    />
                  </ActionPanel>
                }
              />
            }
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon="sad-face.png"
        title="Your costflow config file is not exists"
        description="You can use the default configuration to Create one ⬇️ "
      />
    </List>
  );
};

export default CreateConfig;
