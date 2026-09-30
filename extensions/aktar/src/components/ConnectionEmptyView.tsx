import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { AktarError } from "../api/client";
import { AKTAR_DOWNLOAD_URL, connectToAktar, describeConnectionError, openAktarSettings } from "../lib/errors";

/**
 * Stands in for a list's content when Aktar can't be reached or the
 * extension isn't paired yet, with the action that fixes it first.
 */
export function ConnectionEmptyView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const aktarError = error instanceof AktarError ? error : undefined;
  const { title, description } = aktarError
    ? describeConnectionError(aktarError)
    : { title: "Something Went Wrong", description: error.message };
  const needsConnect = aktarError?.kind === "not-connected" || aktarError?.kind === "unauthorized";

  return (
    <List.EmptyView
      icon={needsConnect ? Icon.Plug : Icon.Warning}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          {needsConnect ? (
            <Action title="Connect to Aktar" icon={Icon.Plug} onAction={connectToAktar} />
          ) : (
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          )}
          <Action title="Open Aktar Settings" icon={Icon.Gear} onAction={openAktarSettings} />
          {needsConnect && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />}
          <Action title="Download Aktar" icon={Icon.Download} onAction={() => open(AKTAR_DOWNLOAD_URL)} />
        </ActionPanel>
      }
    />
  );
}
