import { List } from "@raycast/api";
import TabListItem from "./TabListItem";
import { Device, Tab } from "../types";
import { plural } from "../utils";

const DeviceListSection = (props: { device: Device; filteredTabs: Tab[]; refresh: () => void }) => (
  <List.Section title={props.device.name} subtitle={plural(props.filteredTabs.length, "tab")}>
    {props.filteredTabs.map((tab: Tab) => (
      <TabListItem key={tab.uuid} tab={tab} refresh={props.refresh} />
    ))}
  </List.Section>
);

export default DeviceListSection;
