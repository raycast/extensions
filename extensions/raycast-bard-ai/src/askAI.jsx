// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Asking AI...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function AskAI({ fallbackText }) {
  return ResultView(fallbackText, toast_title, "general", "Ask AI", true);
}
