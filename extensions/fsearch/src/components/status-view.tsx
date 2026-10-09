import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { FSearchError } from "../lib/fsearch";

const INSTALL =
  "git clone https://github.com/noahdunnagan/fsearch && cd fsearch && cargo build --release && ./target/release/fsearch install";

/** The empty state for a failed request: not installed, still indexing, or a query fsearch couldn't read. */
export function StatusView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const reason = error instanceof FSearchError ? error.reason : "unreachable";

  switch (reason) {
    case "indexing":
      return (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="Indexing Your Mac"
          description="The first scan of your disk takes about 20 seconds. Results appear when it's done."
        />
      );
    case "missing":
      return (
        <List.EmptyView
          icon={Icon.Download}
          title="Install FSearch"
          description={`${error.message}. Copy the install command, run it in Terminal, then search again.`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Command" content={INSTALL} />
              <Action.OpenInBrowser title="Open FSearch on GitHub" url="https://github.com/noahdunnagan/fsearch" />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            </ActionPanel>
          }
        />
      );
    case "query":
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Can't Search for That"
          description={sentence(error.message)}
        />
      );
    default:
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Can't Reach FSearch"
          description={sentence(error.message)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            </ActionPanel>
          }
        />
      );
  }
}

/** FSearch errors are lowercase fragments ("unknown type foo"); show them as a sentence. */
function sentence(message: string) {
  const text = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
