import { ActionPanel, List, Action, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { tools } from "../tools";
import { DrupalWebsite } from "../interface";

function ToolList(props: { drupalWebsite: DrupalWebsite }) {
  const [toolWeights, setToolWeights] = useState<{ [key: string]: number }>({});
  const [isToolWeightsLoading, setIsToolWeightsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToolWeights = await LocalStorage.getItem<string>("tool_weights");

      if (!storedToolWeights) {
        setIsToolWeightsLoading(false);
        return;
      }

      try {
        setToolWeights(JSON.parse(storedToolWeights));

        setIsToolWeightsLoading(false);
      } catch (e) {
        setIsToolWeightsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("tool_weights", JSON.stringify(toolWeights));
  }, [toolWeights]);

  return (
    <List searchBarPlaceholder="Tool" isLoading={isToolWeightsLoading}>
      {tools
        .sort((v1, v2) => {
          const w1 = toolWeights[v1.id] == undefined ? 0 : toolWeights[v1.id];
          const w2 = toolWeights[v2.id] == undefined ? 0 : toolWeights[v2.id];

          return w2 - w1;
        })
        ?.map((tool, index) => (
          <List.Item
            keywords={[tool.title]}
            key={index}
            title={tool.title}
            icon={tool.icon ?? "logo.png"}
            actions={
              <ActionPanel>
                <Action
                  icon={tool.icon}
                  title={tool.title}
                  onAction={() => {
                    setToolWeights(Object.assign({ ...toolWeights, [tool.id]: Date.now() }));
                    tool.action(props.drupalWebsite);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

export default ToolList;
