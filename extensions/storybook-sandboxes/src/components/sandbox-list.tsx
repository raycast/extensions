import { List } from "@raycast/api";
import { SANDBOX_GROUPS, Sandbox, SandboxKey } from "../utils/sandboxes";
import { getIcon } from "../utils/get-icon";

export const SandboxList = ({ actions }: { actions: (key: SandboxKey, sandbox: Sandbox) => React.ReactNode }) => {
  return (
    <List searchBarPlaceholder="Search sandboxes by name" isShowingDetail>
      {SANDBOX_GROUPS.map(({ title, sandboxes }) => (
        <List.Section key={title} title={title}>
          {Object.entries(sandboxes).map(([key, sandbox]) => (
            <List.Item
              key={key}
              id={key}
              icon={getIcon(key.includes("nextjs") ? "nextjs" : sandbox.uiFramework)}
              title={sandbox.name}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Sandbox Key" text={key} />
                      <List.Item.Detail.Metadata.Label title="Storybook Framework" text={sandbox.sbFramework} />
                      <List.Item.Detail.Metadata.Label
                        title="Builder"
                        text={sandbox.builder}
                        icon={getIcon(sandbox.builder)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="UI Framework"
                        text={sandbox.uiFramework}
                        icon={getIcon(sandbox.uiFramework)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="UI Framework Version"
                        text={sandbox.uiFrameworkVersion.toString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Language"
                        text={sandbox.language}
                        icon={getIcon(sandbox.language)}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions(key as SandboxKey, sandbox)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
