import { List } from "@raycast/api";
import { CLAUDE_ICON } from "../constants";

/**
 * The description describes what ⏎ actually does. It previously said "hit the enter key"
 * while ⏎ was bound to Full Text Input rather than to submitting — the screen told the user
 * to press enter and enter opened a form instead. It also names ⌘T, so the long-form path
 * is discoverable from the empty state rather than only from the action panel.
 */
export const EmptyView = () => (
  <List.EmptyView
    title="Ask anything!"
    description="Type your question in the search bar and press Enter — or press ⌘T for a larger text field"
    icon={CLAUDE_ICON}
  />
);
