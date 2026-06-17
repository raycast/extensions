import { List } from "@raycast/api";
import { Device, Tab } from "../types";
import { plural } from "../utils";
import TabListItem from "./TabListItem";

export default function DeviceListSection(props: { device: Device; filteredTabs: Tab[]; refresh: () => void }) {
  return (
    <List.Section title={props.device.name} subtitle={plural(props.filteredTabs.length, "tab")}>
      {props.filteredTabs.map((tab: Tab) => (
        <TabListItem key={tab.uuid} tab={tab} refresh={props.refresh} />
      ))}
    </List.Section>
  );
}
