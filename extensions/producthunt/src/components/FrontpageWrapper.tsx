import { FrontpageContent } from "./FrontpageContent";

/**
 * A wrapper component for the frontpage that can be used with Action.Push
 * This allows us to navigate directly to the frontpage from any view
 * Uses the shared FrontpageContent component to avoid code duplication
 */
export function FrontpageWrapper() {
  return <FrontpageContent />;
}
