// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Summarizing...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function Summarize() {
  return ResultView("Summarize the given text.", toast_title, "text", "Summarize");
}
