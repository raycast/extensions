import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { PackageVersionList } from "./PackageVersionList";
import { execAsync } from "./utils/execAsync";
import { InstalledTool as InstalledToolType } from "./hooks/useInstalledTools";

export const InstalledTool = ({
  tool,
  refetchInstalledTools,
  setIsLoading,
}: InstalledToolProps) => {
  const { push } = useNavigation();
  const accessories = [
    { tag: { value: `@${tool.version}`, color: Color.Blue } },
  ];
  if (tool.active)
    accessories.push({
      tag: { value: "Active", color: Color.Green },
    });
  return (
    <List.Item
      title={tool.name}
      keywords={[tool.name]}
      accessories={accessories}
      actions={
        <ActionPanel>
          {!tool.active ? (
            <Action
              title={`Activate ${tool.name}`}
              onAction={async () => {
                try {
                  await execAsync(`mise use -g ${tool.name}@${tool.version}`);
                  refetchInstalledTools();
                  showToast({
                    title: `${tool.name} activated successfully`,
                    style: Toast.Style.Success,
                  });
                } catch {
                  showToast({
                    title: "Activation failed",
                    style: Toast.Style.Failure,
                  });
                }
              }}
            />
          ) : (
            <Action
              title={`Upgrade ${tool.name}`}
              onAction={async () => {
                setIsLoading(true);
                try {
                  const { stderr } = await execAsync(
                    `mise upgrade ${tool.name}`,
                  );
                  if (stderr.includes("All tools are up to date")) {
                    showToast({
                      title: `${tool.name} is already up to date`,
                      style: Toast.Style.Success,
                    });
                    setIsLoading(false);
                    return;
                  }
                  showToast({
                    title: `${tool.name} upgraded successfully`,
                    style: Toast.Style.Success,
                  });
                  refetchInstalledTools();
                } catch {
                  showToast({
                    title: "Upgrade failed",
                    style: Toast.Style.Failure,
                  });
                }
                setIsLoading(false);
              }}
            />
          )}
          <Action
            title="Install Specific Version"
            onAction={() =>
              push(
                <PackageVersionList
                  packageName={tool.name}
                  refetchInstalledTools={refetchInstalledTools}
                />,
              )
            }
          />
          <Action
            title="Remove"
            onAction={async () => {
              const shouldRemove = await confirmAlert({
                title: "Are you sure?",
                message: `This will uninstall ${tool.name}@${tool.version}`,
                primaryAction: {
                  title: "Uninstall",
                  style: Alert.ActionStyle.Destructive,
                },
                dismissAction: {
                  title: "Cancel",
                  style: Alert.ActionStyle.Cancel,
                },
              });
              if (!shouldRemove) return;
              try {
                await execAsync(
                  `mise unuse -g ${tool.name}@${tool.version} -y`,
                );
                refetchInstalledTools();
                showToast({
                  title: `${tool.name} uninstalled successfully`,
                  style: Toast.Style.Success,
                });
              } catch {
                showToast({
                  title: "Uninstallation failed",
                  style: Toast.Style.Failure,
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
};

type InstalledToolProps = {
  tool: InstalledToolType;
  refetchInstalledTools: () => Promise<void>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};
