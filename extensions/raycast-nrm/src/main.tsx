import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import npmExec from "./npm";
import { getRegistrySources } from "./octokit";
import { IRegistrySourceItem } from "./constants";

export default function Command() {
  const [registrySources, setRegistrySources] = useState<IRegistrySourceItem[]>([]);
  const [selectedValue, setSelectedValue] = useState<{ isLoading: boolean; data: string | null }>({
    isLoading: true,
    data: null,
  });
  const initialize = async () => {
    const data = await npmExec.exec("config", "get", "registry");
    const sources = await getRegistrySources();

    setSelectedValue({ isLoading: false, data });
    setRegistrySources(sources);
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
      {registrySources.map((item) => (
        <List.Item
          key={item.id}
          icon={selectedValue.data === item.registry ? Icon.CheckCircle : Icon.Circle}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action title={`Select ${item.title}`} icon={Icon.Check} onAction={() => handleAction(item.registry)} />
              <Action.CopyToClipboard content={item.registry}></Action.CopyToClipboard>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
