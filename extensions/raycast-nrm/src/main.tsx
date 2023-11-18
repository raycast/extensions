import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import npmExec from "./npm";
import { REGISTRY_SOURCES } from "./constants";

export default function Command() {
  const [selectedValue, setSelectedValue] = useState<{ isLoading: boolean; data: string | null }>({
    isLoading: true,
    data: null,
  });
  const initialize = async () => {
    const data = await npmExec.exec("config", "get", "registry");

    setSelectedValue({ isLoading: false, data });
  };
  const handleAction = async (registry: string) => {
    setSelectedValue((pre) => ({ ...pre, isLoading: true }));
    await npmExec.exec("config", "set", `registry=${registry}`);
    setSelectedValue({ isLoading: false, data: registry });
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <List isLoading={selectedValue.isLoading}>
      {REGISTRY_SOURCES.map((item) => (
        <List.Item
          key={item.id}
          icon={selectedValue.data === item.registry ? Icon.CheckCircle : Icon.Circle}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action title={item.title} onAction={() => handleAction(item.registry)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
