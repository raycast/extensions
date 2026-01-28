import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ProviderModelMap, ProvidersMap } from "../constants/provider";
import NotDiamond from "../not-diamond";

export const SelectModel = ({ preferences }: { preferences: Preferences }) => {
  const [selectedModels, setSelectedModels] = useCachedState<string[]>("selected-models", []);

  const availableProviders = Object.entries(ProvidersMap)
    .filter(([key]) => {
      return preferences[key as keyof Preferences] && preferences[key as keyof Preferences] !== "skip";
    })
    .map(([, value]) => value.toLowerCase());

  const toggleModel = (model: string) => {
    setSelectedModels((prevSelected) => {
      if (prevSelected.includes(model)) {
        return prevSelected.filter((m) => m !== model);
      } else {
        return [...prevSelected, model];
      }
    });
  };

  return (
    <List>
      {availableProviders.map((provider) => (
        <List.Section key={provider} title={provider.charAt(0).toUpperCase() + provider.slice(1)}>
          {(ProviderModelMap[provider] || []).map((model) => (
            <List.Item
              key={model}
              title={model}
              icon={selectedModels.includes(model) ? Icon.Checkmark : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Selection"
                    icon={selectedModels.includes(model) ? Icon.Circle : Icon.Checkmark}
                    onAction={() => toggleModel(model)}
                  />
                  <Action.Push title="Start Chat" icon={Icon.Box} target={<NotDiamond />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};

export const getSelectModelActionPanel = (preferences: Preferences) => (
  <Action.Push icon={Icon.Box} title="Select Model" target={<SelectModel preferences={preferences} />} />
);
