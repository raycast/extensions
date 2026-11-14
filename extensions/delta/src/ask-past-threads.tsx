import { Detail, LaunchProps } from "@raycast/api";
import { ThreadAnswer } from "./components/thread-answer";
import { withDelta } from "./components/with-delta";

/**
 * Kept mainly as a fallback command: type a question in Raycast's root search and pick
 * "Ask Past Threads" without retyping it. Day to day, asking from Search Threads is quicker.
 */
function AskPastThreads(props: LaunchProps<{ arguments: Arguments.AskPastThreads }>) {
  const question = (props.arguments.question || props.fallbackText || "").trim();
  return <ThreadAnswer question={question} />;
}

export default withDelta(AskPastThreads, <Detail isLoading />);
