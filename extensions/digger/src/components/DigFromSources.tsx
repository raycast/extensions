import { ReactNode, useEffect, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, openCommandPreferences } from "@raycast/api";
import { SOURCE_NAME, SourceResult, UrlReader } from "../utils/urlSources";
import { urlFromInput } from "../utils/urlText";
import { DigResults } from "./DigResults";

type Resolution =
  { status: "resolving" } | { status: "found"; url: string } | { status: "none"; results: SourceResult[] };

interface DigFromSourcesProps {
  /** Tried in order; the first URL found is dug. */
  readers: UrlReader[];
  /** Text to start the search bar with — a typed argument that wasn't a URL, shown back. */
  initialText?: string;
  /** Offer the command's preferences, where its fallbacks are turned on. */
  showPreferences?: boolean;
  /** Extra actions for the empty view, e.g. a link to install what a source needs. */
  extraActions?: ReactNode;
}

/** The app icon: this view is Digger waiting for input, not a failure. */
const DIGGER_ICON = "digger-128.png";

/**
 * Finds a URL in the given places, then digs it. When none holds one, says what
 * each place answered — "the clipboard has no URL" and "couldn't read the
 * browser tab" are different situations — and lets a URL be typed instead.
 */
export function DigFromSources({ readers, initialText, showPreferences, extraActions }: DigFromSourcesProps) {
  const [resolution, setResolution] = useState<Resolution>({ status: "resolving" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const results: SourceResult[] = [];
      for (const read of readers) {
        const result = await read();
        if (canceled) return;
        if (result.outcome === "found") {
          setResolution({ status: "found", url: result.url });
          return;
        }
        results.push(result);
      }
      setResolution({ status: "none", results });
    })();
    return () => {
      canceled = true;
    };
  }, [attempt]);

  if (resolution.status === "found") return <DigResults url={resolution.url} />;
  if (resolution.status === "resolving") return <List isLoading searchBarPlaceholder="Looking for a URL…" />;

  return (
    <NoUrlView
      results={resolution.results}
      initialText={initialText}
      showPreferences={showPreferences}
      extraActions={extraActions}
      onTryAgain={
        readers.length > 0
          ? () => {
              setResolution({ status: "resolving" });
              setAttempt((n) => n + 1);
            }
          : undefined
      }
    />
  );
}

function sentence(parts: string[]): string {
  const joined =
    parts.length <= 2 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

function phrase(result: SourceResult): string {
  if (result.outcome === "unavailable") return `couldn't read the ${SOURCE_NAME[result.source]}`;
  if (result.outcome === "absent") return result.detail;
  return result.url;
}

/** Title, description and icon for the empty view. One-sentence descriptions: EmptyView collapses newlines. */
function emptyCopy(results: SourceResult[], typedText: string, typedUrl: string | null, showPreferences?: boolean) {
  if (typedUrl) return { icon: DIGGER_ICON, title: `Dig ${typedUrl}`, description: "Press Return to dig this URL." };
  if (typedText)
    return {
      icon: Icon.Warning,
      title: `“${typedText.length > 40 ? `${typedText.slice(0, 40)}…` : typedText}” isn't a URL`,
      description: "Type a website address, like raycast.com.",
    };
  if (results.length === 0)
    return {
      icon: DIGGER_ICON,
      title: "Type a URL to dig",
      description: showPreferences
        ? "Or turn on a fallback in preferences to dig the selection, clipboard, or browser tab."
        : "",
    };
  if (results.length === 1) {
    const [only] = results;
    return only.outcome === "unavailable"
      ? { icon: Icon.Warning, title: `Couldn't read the ${SOURCE_NAME[only.source]}`, description: only.error }
      : { icon: DIGGER_ICON, title: sentence([phrase(only)]).slice(0, -1), description: "Type a URL above to dig it." };
  }
  const failed = results.some((result) => result.outcome === "unavailable");
  return {
    icon: failed ? Icon.Warning : DIGGER_ICON,
    title: "No URL found",
    description: sentence(results.map(phrase)),
  };
}

function NoUrlView({
  results,
  initialText,
  showPreferences,
  extraActions,
  onTryAgain,
}: Omit<DigFromSourcesProps, "readers"> & {
  results: SourceResult[];
  onTryAgain?: () => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const typed = urlFromInput(text);
  const failures = results.filter((result) => result.outcome === "unavailable");
  const { icon, title, description } = emptyCopy(results, text.trim(), typed, showPreferences);
  const report = results
    .map(
      (result) => `${SOURCE_NAME[result.source]}: ${result.outcome === "unavailable" ? result.error : phrase(result)}`,
    )
    .join("\n");

  return (
    <List searchText={text} onSearchTextChange={setText} searchBarPlaceholder="Type a URL to dig" filtering={false}>
      {/* Always the empty view, never a row for the typed URL: swapping between
          the two as you type left Raycast showing its own "No Results". */}
      <List.EmptyView
        icon={icon}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            {typed ? (
              <Action.Push title="Dig This URL" icon={Icon.MagnifyingGlass} target={<DigResults url={typed} />} />
            ) : null}
            {onTryAgain && !text.trim() ? (
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={onTryAgain}
              />
            ) : null}
            {extraActions}
            {showPreferences ? (
              <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            ) : null}
            {failures.length > 0 ? (
              <Action.CopyToClipboard title="Copy Error" content={report} shortcut={Keyboard.Shortcut.Common.Copy} />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}
