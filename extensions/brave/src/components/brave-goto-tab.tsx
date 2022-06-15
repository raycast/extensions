import { ActionPanel, closeMainWindow, Icon, popToRoot } from "@raycast/api";
import { setActiveTab } from "../utils";
import Tab from "./tab";

export default function BraveGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await closeMainWindow();
    await popToRoot();
    await setActiveTab(props.tab);
  }

  return <ActionPanel.Item title="Open tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
