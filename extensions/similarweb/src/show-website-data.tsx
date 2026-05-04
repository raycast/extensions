import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { fetchWebsiteData } from "./api/similarweb";
import { resolveDomain } from "./lib/domain";
import { buildWebsiteSections } from "./lib/format";
import { saveSnapshot } from "./lib/history";
import type { WebsiteSnapshot } from "./types";

type Props = LaunchProps<{ arguments: { domain?: string } }>;

const OPEN_HISTORY_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "h" },
  Windows: { modifiers: ["ctrl"], key: "h" },
};

type LoadState = {
  isLoading: boolean;
  snapshot?: WebsiteSnapshot;
  error?: string;
};

export default function Command(props: Props) {
  const domainInput = props.arguments.domain;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<LoadState>({ isLoading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((current) => ({
        isLoading: true,
        snapshot: current.snapshot,
        error: undefined,
      }));

      try {
        const resolved = await resolveDomain(domainInput);
        const data = await fetchWebsiteData(resolved.domain);
        const snapshot: WebsiteSnapshot = {
          domain: resolved.domain,
          fetchedAt: new Date().toISOString(),
          source: resolved.source,
          data,
        };

        try {
          await saveSnapshot(snapshot);
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Save Snapshot",
            message: "The snapshot could not be stored in local history.",
          });
        }

        if (!cancelled) {
          setState({
            isLoading: false,
            snapshot,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            isLoading: false,
            snapshot: undefined,
            error: getErrorMessage(error),
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [domainInput, reloadToken]);

  const sections = useMemo(() => {
    if (!state.snapshot) {
      return [];
    }

    return buildWebsiteSections(state.snapshot);
  }, [state.snapshot]);

  const snapshot = state.snapshot;

  return (
    <List isLoading={state.isLoading} isShowingDetail searchBarPlaceholder="Browse website data sections">
      {sections.map((section) => (
        <List.Item
          key={section.key}
          icon={Icon.Globe}
          title={section.title}
          subtitle={section.subtitle}
          detail={<List.Item.Detail markdown={section.markdown} />}
          actions={
            snapshot ? (
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => setReloadToken((value) => value + 1)}
                />
                <Action.CopyToClipboard
                  title="Copy Raw JSON"
                  content={JSON.stringify(snapshot.data, null, 2)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Open Website History"
                  icon={Icon.Clock}
                  shortcut={OPEN_HISTORY_SHORTCUT}
                  onAction={() =>
                    void launchCommand({
                      name: "history",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
                <Action.OpenInBrowser
                  title="Open Similarweb Page"
                  url={`https://www.similarweb.com/website/${snapshot.domain}/`}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "s" },
                    Windows: { modifiers: ["ctrl"], key: "s" },
                  }}
                />
                <Action.OpenInBrowser
                  title="Open Website"
                  url={`https://${snapshot.domain}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
      {!state.isLoading && !state.snapshot ? (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Could Not Load Website Data"
          subtitle={domainInput?.trim() ? domainInput.trim() : "Active tab lookup"}
          detail={<List.Item.Detail markdown={formatErrorMarkdown(state.error)} />}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => setReloadToken((value) => value + 1)}
              />
              <Action
                title="Open Website History"
                icon={Icon.Clock}
                shortcut={OPEN_HISTORY_SHORTCUT}
                onAction={() => void launchCommand({ name: "history", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function formatErrorMarkdown(message?: string): string {
  const detail = message ?? "Unknown error";

  return [
    "# Unable to Load Website Data",
    detail,
    "",
    "## Try Next",
    "- **Provide a domain manually**: e.g. `github.com` or `https://github.com/features`",
    "- **Use a regular website tab**: browser pages like `chrome://` and `file://` are rejected",
    "- **Enable the Raycast browser extension**: needed for active-tab lookup when no argument is passed",
  ].join("\n");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
