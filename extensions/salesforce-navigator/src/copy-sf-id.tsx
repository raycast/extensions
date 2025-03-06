import * as React from "react";
import { List, ActionPanel, Action, Clipboard, showToast, Toast, BrowserExtension, Icon, showHUD } from "@raycast/api";

type SalesforceTab = {
  id: string;
  active: boolean;
  orgName: string;
  recordId: string;
  url: string;
};

/**
 * SalesforceTabItem renders each tab.
 * It fetches the page title in order to display a human-readable record name.
 */
function SalesforceTabItem({ tab }: { tab: SalesforceTab }) {
  const [recordName, setRecordName] = React.useState("Loading…");

  React.useEffect(() => {
    async function fetchRecordName() {
      try {
        const title = await BrowserExtension.getContent({
          cssSelector: "title",
          format: "text",
          tabId: Number(tab.id),
        });
        // Expect title to be like: "Record Name | sObject | Salesforce"
        const parsedTitle = title.split(" | ")[0].trim();
        setRecordName(parsedTitle || "Untitled Record");
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("RaycastRPC.ResponseError")) {
          setRecordName("Not Available");
        } else {
          console.error("Failed to fetch record name:", error);
          setRecordName("Untitled Record");
        }
      }
    }
    fetchRecordName();
  }, [tab.id]);

  return (
    <List.Item
      key={tab.id}
      title={`${tab.orgName} - ${recordName}`}
      subtitle={tab.recordId}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Sf Id"
            onAction={async () => {
              await Clipboard.copy(tab.recordId);
              await showHUD(`Sf Id from ${tab.orgName} (${tab.recordId}) Copied!`);
            }}
          />
          <Action.OpenInBrowser title="Open Tab" url={tab.url} icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}

/**
 * In this version, we attempt to detect a Salesforce ID in the URL by:
 *  1. Trying the standard record URL pattern: /r/<sObject>/<ID>/view
 *  2. Checking for a query parameter "flowId" (useful for Salesforce Flow pages)
 *  3. Fallback: looking for a "startURL" parameter that might encode a record URL.
 */
export default function Command() {
  const [sfTabs, setSFTabs] = React.useState<SalesforceTab[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    async function fetchSalesforceTabs() {
      try {
        const tabs = await BrowserExtension.getTabs();
        console.log("All tabs:", tabs.map((t) => t.url).join("\n"));

        const salesforceTabs: SalesforceTab[] = tabs
          .filter((tab) => tab.url.includes("force.com"))
          .map((tab) => {
            let recordId = "";
            try {
              // 1. Try matching the standard record URL pattern (/r/<sObject>/<ID>/view)
              const recordMatch = tab.url.match(/\/r\/[^/]+\/([a-zA-Z0-9]{15,18})\/view/);
              if (recordMatch && recordMatch[1]) {
                recordId = recordMatch[1];
              } else {
                // Create URL object for further processing
                const urlObj = new URL(tab.url);
                // 2. Check if there's a query parameter "flowId"
                const flowId = urlObj.searchParams.get("flowId");
                if (flowId && /^[a-zA-Z0-9]{15,18}$/.test(flowId)) {
                  recordId = flowId;
                } else {
                  // 3. Fallback: Look for a "startURL" query parameter (which might be double encoded)
                  const startURL = urlObj.searchParams.get("startURL");
                  if (startURL) {
                    const decodedURL = decodeURIComponent(decodeURIComponent(startURL));
                    const candidateMatch = decodedURL.match(/\/r\/[^/]+\/([a-zA-Z0-9]{15,18})\/view/);
                    if (candidateMatch && candidateMatch[1]) {
                      recordId = candidateMatch[1];
                    }
                  }
                }
              }
            } catch (e) {
              console.error("Error parsing Salesforce URL:", e);
            }

            // Extract org name from the hostname. Example: "edudeo" from "edudeo.my.salesforce.com"
            let orgName = "Unknown Org";
            try {
              const hostname = new URL(tab.url).hostname;
              orgName = hostname.split(".")[0];
            } catch (err) {
              console.log("Error parsing hostname:", err);
            }

            return {
              id: tab.id.toString(),
              active: Boolean(tab.active),
              orgName,
              recordId,
              url: tab.url,
            };
          })
          // Only keep entries where we found a record ID.
          .filter((tab) => tab.recordId !== "");

        // Sort so that active tabs come first.
        salesforceTabs.sort((a, b) => (a.active && !b.active ? -1 : !a.active && b.active ? 1 : 0));

        setSFTabs(salesforceTabs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching tabs:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error fetching browser tabs",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSalesforceTabs();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Copy Sf Id">
      <List.Section title="Salesforce Tabs">
        {sfTabs.map((tab) => (
          <SalesforceTabItem key={tab.id} tab={tab} />
        ))}
      </List.Section>
    </List>
  );
}
