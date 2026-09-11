import { FrontpageContent } from "./components/FrontpageContent";
import { logger } from "@chrismessina/raycast-logger";
import { useEffect } from "react";

const log = logger.child("[ProductHuntFrontpage]");

/**
 * Main command entry point for the Product Hunt extension
 * Uses the shared FrontpageContent component to display featured products
 */
export default function Command() {
  // Emit a lightweight session start event after initial mount (avoid logging during render)
  useEffect(() => {
    log.info("Frontpage command opened");
  }, []);
  return <FrontpageContent />;
}
