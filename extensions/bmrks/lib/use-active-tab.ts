import React from "react";
import { BrowserExtension } from "@raycast/api";

type ActiveTab = {
  url: string;
  title: string;
};

/**
 * Hook to get the active browser tab using Raycast's Browser Extension API
 * @returns The active tab's URL and title, or null if not available
 */
export function useActiveTab() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        // Get all tabs from the browser extension
        const tabs = await BrowserExtension.getTabs();
        
        // Find the active tab
        const activeTab = tabs.find(tab => tab.active);
        
        if (!activeTab || !activeTab.url) {
          return;
        }
        
        setActiveTab({
          url: activeTab.url,
          title: activeTab.title || "",
        });
      } catch (error) {
        console.error("Error retrieving active tab:", error);
      }
    })();
  }, []);

  return activeTab;
}
