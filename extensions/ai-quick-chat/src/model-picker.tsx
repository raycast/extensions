import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { setActiveSelection } from "./provider-store";
import type { ProviderProfile } from "./types";

export function ModelPicker(props: {
  providers: ProviderProfile[];
  onSelect: (
    provider: ProviderProfile,
    modelId: string,
  ) => void | Promise<void>;
  title?: string;
}) {
  const { pop } = useNavigation();

  return (
    <List
      navigationTitle={props.title ?? "Select Model"}
      searchBarPlaceholder="Search providers and models..."
    >
      {props.providers.map((provider) => {
        const models = Array.from(
          new Set(
            [provider.defaultModelId, ...provider.models].filter(Boolean),
          ),
        );
        return (
          <List.Section
            key={provider.id}
            title={provider.name}
            subtitle={provider.baseUrl}
          >
            {models.map((modelId) => (
              <List.Item
                key={`${provider.id}:${modelId}`}
                icon={Icon.Stars}
                title={modelId}
                subtitle={provider.name}
                actions={
                  <ActionPanel>
                    <Action
                      title="Use Model"
                      icon={Icon.Checkmark}
                      onAction={async () => {
                        await setActiveSelection({
                          providerId: provider.id,
                          modelId,
                        });
                        await props.onSelect(provider, modelId);
                        pop();
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
