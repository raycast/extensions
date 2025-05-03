// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Finding synonym...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function Synonym() {
  return ResultView(
    "Give a one word answer with the most relevant and closely matched word. Try your best to match the part of speech of the original word. If no synonym can be found, say 'No synonym can be found.'",
    toast_title,
    "text",
    "Find Synonym"
  );
}
