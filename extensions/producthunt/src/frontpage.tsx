import { FrontpageContent } from "./components/FrontpageContent";

/**
 * Main command entry point for the Product Hunt extension
 * Uses the shared FrontpageContent component to display featured products
 */
export default function Command() {
  return <FrontpageContent />;
}
