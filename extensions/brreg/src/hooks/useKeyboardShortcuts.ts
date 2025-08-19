import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "../utils/toast";

export function useKeyboardShortcuts() {
  const [showMoveIndicators, setShowMoveIndicators] = useState(false);

  const handleCopyOrgNumber = useCallback((orgNumber: string) => {
    if (orgNumber) {
      // Copy to clipboard using Raycast's clipboard API
      // Note: In Raycast, we typically use Action.CopyToClipboard, but for keyboard shortcuts
      // we can use the native clipboard API
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard
          .writeText(orgNumber)
          .then(() => {
            showToast(Toast.Style.Success, "Organization number copied", orgNumber);
          })
          .catch(() => {
            showFailureToast("Failed to copy organization number");
          });
      } else {
        // Fallback for environments without clipboard API
        showFailureToast("Clipboard not available");
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle move mode indicators (cmd+shift)
      if (event.metaKey && event.shiftKey) {
        setShowMoveIndicators(true);
      }

      // Handle copy organization number (cmd+o)
      if (event.metaKey && event.key === "o" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        // Emit a custom event that components can listen to
        // The component will need to provide the current org number
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("copyOrgNumber"));
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey || !event.shiftKey) {
        setShowMoveIndicators(false);
      }
    };

    // Use window instead of document for Raycast compatibility
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, []);

  return {
    showMoveIndicators,
    handleCopyOrgNumber,
  };
}
