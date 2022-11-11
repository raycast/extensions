import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { List } from "@raycast/api";

/**
 * Xcode Simulator Application List Item Detail
 */
export function XcodeSimulatorApplicationListItemDetail(props: {
  application: XcodeSimulatorApplication;
}): JSX.Element {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={props.application.name} />
          <List.Item.Detail.Metadata.Label title="Version" text={props.application.version} />
          <List.Item.Detail.Metadata.Label title="Build" text={props.application.buildNumber} />
          <List.Item.Detail.Metadata.Label title="Bundle identifier" text={props.application.bundleIdentifier} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Simulator" text={props.application.simulator.name} />
          <List.Item.Detail.Metadata.Label title="Runtime" text={props.application.simulator.runtime} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
