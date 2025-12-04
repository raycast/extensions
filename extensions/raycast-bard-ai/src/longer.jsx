// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Making longer...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function Longer() {
  return ResultView(
    "Make the following text longer without providing any extra information than what's given.\n\n",
    toast_title,
    "text",
    "Make Longer"
  );
}
