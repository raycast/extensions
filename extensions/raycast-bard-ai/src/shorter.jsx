// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Making shorter...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function Shorter() {
  return ResultView(
    "Make the following text shorter, while keeping the core idea.",
    toast_title,
    "text",
    "Make shorter"
  );
}
