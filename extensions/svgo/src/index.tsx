import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { configHelper, SVGOPlugin } from "./utils-2";

export default function SVGOConfig() {
  const [config, setConfig] = useState<SVGOPlugin[]>([]);
  const [forceUpdate, setForceUpdate] = useState(false);
  const triggerUpdate = () => setForceUpdate((cur) => !cur);

  const updateConfig = (index: number) => {
    const newVal = [...config];
    newVal[index].enabledByDefault = !newVal[index].enabledByDefault;
    configHelper.saveConfig(newVal);
    triggerUpdate();
  };
  const restoreConfig = async () => {
    configHelper.restore();
    triggerUpdate();
  };

  useEffect(() => {
    const init = async () => {
      const config = configHelper.getAllConfig();
      setConfig(config);
    };
    init();
  }, [forceUpdate]);

  // TODO: add description to each plugin (example is the best)
  return (
    <List navigationTitle="Update SVGO config for all commands" searchBarPlaceholder="Search plugin" throttle={true}>
      {config.map((item, index) => (
        <List.Item
          key={index}
          icon={item.enabledByDefault ? Icon.CheckCircle : Icon.Circle}
          title={item.name}
          actions={
            <ActionPanel>
              <Action title="Toggle (auto save)" onAction={() => updateConfig(index)} />
              <Action title="Restore default configs" onAction={restoreConfig} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
