import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@raycast/api";

import { useSettings, useWorkflows, type Workflow, type Settings } from "./settings";
import { editors, bundleIds } from "./shared";
import { checkRelaInstallation } from "./app";

const Item = ({
  workflow,
  preferences,
  settings,
}: {
  workflow: Workflow;
  preferences: Preferences;
  settings: Partial<Settings>;
}) => {
  return (
    <List.Item
      title={workflow.name}
      subtitle={workflow.description}
      detail={
        <List.Item.Detail
          markdown={`\`\`\`ts
${workflow.content}
\`\`\``}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Path"></List.Item.Detail.Metadata.Label>
              <List.Item.Detail.Metadata.Label title={workflow.pluginPath}></List.Item.Detail.Metadata.Label>
              <List.Item.Detail.Metadata.Separator />
              {workflow.nativePath ? (
                <>
                  <List.Item.Detail.Metadata.Label title="Native Path"></List.Item.Detail.Metadata.Label>
                  <List.Item.Detail.Metadata.Label title={workflow.nativePath}></List.Item.Detail.Metadata.Label>
                  <List.Item.Detail.Metadata.Separator />
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={`Open in ${preferences.application?.name || editors[settings.externalEditor || "code"]}`}
            icon={Icon.Code}
            onAction={async () => {
              const bundles = preferences.application?.bundleId || bundleIds[settings.externalEditor || "code"];

              if (Array.isArray(bundles)) {
                for (const bundle of bundles) {
                  try {
                    await open(workflow.path, bundle);
                    break;
                  } catch {
                    // noop, try next bundle
                  }

                  return;
                }
              }

              await open(workflow.path, bundles as string);
            }}
          />
        </ActionPanel>
      }
    />
  );
};

export default () => {
  const preferences = getPreferenceValues();
  const settings = useSettings();
  const workflows = useWorkflows();

  checkRelaInstallation();

  return (
    <List isShowingDetail isLoading={workflows === undefined}>
      <List.Section title=".relagit/workflows">
        {workflows?.relagit.map((workflow) => (
          <Item key={workflow.path} preferences={preferences} settings={settings} workflow={workflow} />
        ))}
      </List.Section>
      <List.Section title="external.json">
        {workflows?.external.map((workflow) => (
          <Item key={workflow.path} preferences={preferences} settings={settings} workflow={workflow} />
        ))}
      </List.Section>
    </List>
  );
};
