import { BrowserExtension, LaunchProps, showHUD } from "@raycast/api";
import { createAndCopyWeblocFile } from "./utils";

interface Arguments {
  title?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const { title: customTitle } = props.arguments;

  try {
    // Get the active browser tab
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);

    if (!activeTab || !activeTab.url) {
      await showHUD("❌ No active browser tab found");
      return;
    }

    // Create and copy webloc file using the abstracted function
    await createAndCopyWeblocFile({
      url: activeTab.url,
      customTitle,
      fallbackTitle: activeTab.title || "Untitled",
      titleSource: "page title",
    });
  } catch (error) {
    console.error("Error creating webloc file:", error);
    await showHUD(`❌ Failed to create webloc file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
