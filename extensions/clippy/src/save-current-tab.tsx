import { showToast, Toast, popToRoot } from "@raycast/api";
import AuthenticatedView from "./components/authenticated-view";
import { useActiveTab } from "../lib/use-active-tab";
import { saveLink } from "../lib/api";
import { API_URL } from "../lib/api-url";
import { authorize } from "../lib/oauth";
import { useAuth } from "../lib/use-auth";
import { useEffect, useState } from "react";

function SaveCurrentTab() {
  const activeTab = useActiveTab();
  const { data: userData, isLoading: authLoading } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only start the timer after authentication is complete
    if (authLoading || !userData) {
      return;
    }

    // Wait a moment for the hook to complete its initial check
    const timer = setTimeout(() => {
      setHasChecked(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [authLoading, userData]);

  useEffect(() => {
    // Don't do anything until auth is complete and we've given the hook time to check
    if (authLoading || !userData || !hasChecked) {
      return;
    }

    if (!activeTab) {
      // Show error and close immediately
      showToast({
        style: Toast.Style.Failure,
        title: "No active tab found",
        message: "Please open a browser tab and try again",
      }).then(() => popToRoot());
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
          // If it failed, show a subtle error notification
          await showToast({
            style: Toast.Style.Failure,
            title: "Link save failed",
            message: result.error || "Please try again",
          });
        }
      } catch (error) {
        // Error already handled by toast
        // Show a subtle error notification
        await showToast({
          style: Toast.Style.Failure,
          title: "Link save failed",
          message: "Please try again",
        });
      }
    })();
  }, [activeTab, hasChecked, authLoading, userData]);

  return null;
}

export default function Command() {
  return <AuthenticatedView component={SaveCurrentTab} />;
}
