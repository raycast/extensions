// Import the ResultView component from the common module.
import ResultView from "./api/common";

// Set the title of the toast message.
const toast_title = "Making text friendly...";

// Export a function that returns a ResultView component with the given text and toast title.
export default function Friendly() {
  return ResultView(
    "Make the following text seem more friendly. Do not ask any rhetorical questions. That is, DO NOT use a question mark unless the user has a question mark in their input. Make it seem like you are talking to someone you know.\n\n",
    toast_title,
    "text",
    "Make Friendly"
  );
}
