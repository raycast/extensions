import { XcodeSimulator } from "../../models/xcode-simulator/xcode-simulator.model";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { XcodeSimulatorState } from "../../models/xcode-simulator/xcode-simulator-state.model";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { XcodeSimulatorOpenUrlForm } from "./xcode-simulator-open-url-form.component";
import { XcodeSimulatorRenameForm } from "./xcode-simulator-rename-form.component";

/**
 * Xcode Simulator List Item
 */
export function XcodeSimulatorListItem(props: { simulator: XcodeSimulator; revalidate: () => void }): JSX.Element {
  return (
    <List.Item
      icon={{ source: "xcode-simulator.png" }}
      title={props.simulator.name}
      subtitle={props.simulator.runtime}
      accessories={[
        {
          text: props.simulator.state,
          icon:
            props.simulator.state === XcodeSimulatorState.booted
              ? {
                  source: Icon.Checkmark,
                  tintColor: Color.Green,
                }
              : null,
        },
      ]}
      keywords={[props.simulator.name, props.simulator.runtime]}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Power}
            title={props.simulator.state === XcodeSimulatorState.shutdown ? "Boot" : "Shutdown"}
            onAction={() => {
              const isShutdown = props.simulator.state === XcodeSimulatorState.shutdown;
              operationWithUserFeedback(
                "Please wait",
                `${props.simulator.name} ${isShutdown ? "booted" : "shutdown"}`,
                `Failed to ${isShutdown ? "boot" : "shutdown"} ${props.simulator.name}`,
                async () => {
                  await XcodeSimulatorService.toggle(props.simulator);
                  props.revalidate();
                }
              );
              props.revalidate();
            }}
          />
          {props.simulator.state === XcodeSimulatorState.booted && (
            <>
              <Action
                icon={Icon.ArrowCounterClockwise}
                title="Restart"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => {
                  operationWithUserFeedback(
                    "Please wait",
                    `${props.simulator.name} restarted`,
                    `Failed to restart ${props.simulator.name}`,
                    async () => {
                      await XcodeSimulatorService.restart(props.simulator);
                      props.revalidate();
                    }
                  );
                  props.revalidate();
                }}
              />
              <Action.Push
                icon={Icon.Link}
                title="Open URL"
                target={<XcodeSimulatorOpenUrlForm simulator={props.simulator} />}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />

              <Action
                icon={Icon.Cloud}
                title="Trigger iCloud Sync"
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={() => {
                  operationWithUserFeedback(
                    "Please wait",
                    `iCloud Sync triggered on ${props.simulator.name}`,
                    `Failed to trigger iCloud Sync on ${props.simulator.name}`,
                    async () => {
                      await XcodeSimulatorService.triggerIcloudSync(props.simulator);
                    }
                  );
                }}
              />
            </>
          )}

          <Action.ShowInFinder path={props.simulator.dataPath} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          <Action.Push
            icon={Icon.Pencil}
            title="Rename"
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<XcodeSimulatorRenameForm simulator={props.simulator} onRename={props.revalidate} />}
          />
        </ActionPanel>
      }
    />
  );
}
