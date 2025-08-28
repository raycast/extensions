import { useState, useEffect } from "react";

export function useKeyboardShortcuts() {
  const [showMoveIndicators, setShowMoveIndicators] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle move mode indicators (cmd+shift)
      if (event.metaKey && event.shiftKey) {
        setShowMoveIndicators(true);
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
  };
}
