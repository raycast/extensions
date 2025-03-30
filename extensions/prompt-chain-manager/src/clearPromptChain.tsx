import { useEffect } from "react";
import {
  confirmAlert,
  Alert,
  LocalStorage,
  showToast,
  Toast,
  closeMainWindow,
  Icon, // Icon was already imported
  Color, // <-- ADDED Color IMPORT
} from "@raycast/api";

const STORAGE_KEY = "promptChainChunks_v1"; // Must match the key used elsewhere

/**
 * Command component to clear the entire prompt chain after user confirmation.
 */
export default function ClearPromptChainCommand() {
  useEffect(() => {
    async function confirmAndClear() {
      console.log("ClearPromptChain Command: Started.");
      try {
        if (
          await confirmAlert({
            title: "Clear Prompt Chain?",
            message: "Are you sure you want to remove all stored chunks? This action cannot be undone.",
            // Use the correctly imported Icon and Color
            icon: { source: Icon.Trash, tintColor: Color.Red },
            primaryAction: {
              title: "Clear Chain",
              style: Alert.ActionStyle.Destructive,
            },
            // Optional: Add a cancel action title if desired
            // cancelAction: { title: "Keep Chain" }
          })
        ) {
          // User confirmed
          console.log("ClearPromptChain Command: User confirmed clearing.");
          const toast = await showToast(Toast.Style.Animated, "Clearing Chain...");
          try {
            await LocalStorage.removeItem(STORAGE_KEY);
            toast.style = Toast.Style.Success;
            toast.title = "Chain Cleared";
            toast.message = "All prompt chunks have been removed.";
            console.log("ClearPromptChain Command: LocalStorage item removed.");
          } catch (error) {
            console.error("ClearPromptChain Command: Failed to remove item from LocalStorage:", error);
            toast.style = Toast.Style.Failure;
            toast.title = "Error Clearing Chain";
            toast.message = error instanceof Error ? error.message : "Could not remove stored data.";
          }
        } else {
          // User cancelled
          console.log("ClearPromptChain Command: User cancelled clearing.");
          await showToast(Toast.Style.Success, "Clear Cancelled");
        }
      } catch (error) {
        // Error during confirmAlert itself (less likely)
        console.error("ClearPromptChain Command: Error during confirmation:", error);
        await showToast(Toast.Style.Failure, "Error", "Could not show confirmation alert.");
      } finally {
        // Close the command window regardless of outcome
        console.log("ClearPromptChain Command: Closing window.");
        // Add a short delay so user can see the final toast
        setTimeout(async () => {
          await closeMainWindow({ clearRootSearch: false });
        }, 700);
      }
    }

    // Run the confirmation logic when the command launches
    confirmAndClear();
  }, []); // Empty dependency array ensures this runs only once

  // This command uses confirmAlert which requires 'view' mode,
  // but doesn't render anything itself persistently. Return null.
  return null;
}
