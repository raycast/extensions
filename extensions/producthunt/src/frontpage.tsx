import { FrontpageContent } from "./components/FrontpageContent";
import { configureFromRaycastPreferences, getLogger } from "./util/logger";
import { useEffect } from "react";

// Initialize logger based on Raycast preferences at command entry
configureFromRaycastPreferences();
const log = getLogger("ui.frontpage");

/**
 * Main command entry point for the Product Hunt extension
 * Uses the shared FrontpageContent component to display featured products
 */
export default function Command() {
  // Emit a lightweight session start event after initial mount (avoid logging during render)
  useEffect(() => {
    log.info("session:start", "Frontpage command opened");
  }, []);
  return <FrontpageContent />;
}
