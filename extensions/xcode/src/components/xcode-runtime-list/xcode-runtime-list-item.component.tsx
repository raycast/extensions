import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import { XcodeRuntime } from "../../models/xcode-runtime/xcode-runtime.model";
import { XcodeRuntimeService } from "../../services/xcode-runtime.service";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";

export function XcodeRuntimeListItem(props: { runtime: XcodeRuntime; revalidate: () => void }) {
  return (
    <List.Item
      title={{
        tooltip:
          props.runtime.lastUsageDate !== undefined
            ? "Last used on " + props.runtime.lastUsageDate.toLocaleDateString()
            : null,
        value: props.runtime.name,
      }}
      subtitle={{ tooltip: "Build version", value: props.runtime.buildVersion }}
      keywords={[props.runtime.platform, props.runtime.name, props.runtime.version]}
      accessories={[
        ...(!props.runtime.isSupported
          ? [
              {
                icon: {
                  source: Icon.Warning,
                  tintColor: Color.Red,
                },
                tooltip: "Not supported (may be deleted)",
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={props.runtime.name}>
            <Action.CopyToClipboard content={props.runtime.buildVersion} />
            <Action
              title="Delete Runtime"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const alertOptions: Alert.Options = {
                  icon: Icon.Trash,
                  title: "Delete Runtime",
                  message: `Are you sure you want to delete the ${props.runtime.name} runtime?`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                };
                if (!(await confirmAlert(alertOptions))) {
                  return;
                }
                operationWithUserFeedback(
                  "Deleting Runtime...",
                  `${props.runtime.name} runtime has been deleted`,
                  "Error Deleting runtime",
                  async () => {
                    await XcodeRuntimeService.deleteXcodeRuntime(props.runtime);
                    props.revalidate();
                  }
                );
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="All">
            <Action
              title="Delete Unsupported Runtimes"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={async () => {
                const alertOptions: Alert.Options = {
                  icon: Icon.Trash,
                  title: "Delete unsupported runtimes",
                  message: "Are you sure you want to delete all unsupported runtimes?",
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                };
                if (!(await confirmAlert(alertOptions))) {
                  return;
                }
                await operationWithUserFeedback(
                  "Deleting unsupported runtimes",
                  "Successfully deleted unsupported runtimes",
                  "An error occurred while trying to delete unsupported runtimes",
                  async () => {
                    await XcodeRuntimeService.deleteUnsupportedXcodeRuntimes();
                    props.revalidate();
                  }
                );
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
