import { XcodeSimulator } from "../../models/xcode-simulator/xcode-simulator.model";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { XcodeSimulatorState } from "../../models/xcode-simulator/xcode-simulator-state.model";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

/**
 * Xcode Simulator List Item
 */
export function XcodeSimulatorListItem(props: { simulator: XcodeSimulator; revalidate: () => void }): JSX.Element {
  return (
    <List.Item
      key={props.simulator.udid}
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
            key="boot-or-shutdown"
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
          <Action.ShowInFinder key="show-in-finder" path={props.simulator.dataPath} />
        </ActionPanel>
      }
    />
  );
}
