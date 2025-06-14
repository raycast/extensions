import { showToast, Toast, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import AuthenticatedView from "./components/authenticated-view";
import { useActiveTab } from "../lib/use-active-tab";
import { saveLink } from "../lib/api";
import { API_URL } from "../lib/api-url";
import { authorize } from "../lib/oauth";
import { useAuth } from "../lib/use-auth";
import { useEffect } from "react";

function SaveCurrentTab() {
  const activeTab = useActiveTab();
  const { data: userData, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !userData) {
      return;
    }

    if (!activeTab) {
      // Show error and close immediately
      showFailureToast(new Error("Please open a browser tab and try again"), { title: "No active tab found" }).then(
        () => popToRoot(),
      );
      return;
    }

    (async () => {
      try {
        // Show immediate success toast and close view
        await showToast({
          style: Toast.Style.Success,
          title: "Link saved!",
          message: activeTab,
        });

        // Close the view immediately
        await popToRoot();

        // Save in background after closing
        const token = await authorize();
        const result = await saveLink({
          url: activeTab,
          token,
          apiUrl: API_URL,
        });

        if (!result.success) {
          throw new Error(result.error || "Please try again");
        }
      } catch (error) {
        // Show a subtle error notification
        showFailureToast(error, { title: "Link save failed" });
      }
    })();
  }, [activeTab, authLoading, userData]);

  return null;
}

export default function Command() {
  return <AuthenticatedView component={SaveCurrentTab} />;
}
