import { Action, ActionPanel, Icon, Image, Keyboard } from "@raycast/api";
import { Args } from "../lib/core";
import { Obj, listingRef, pick } from "../lib/format";
import { TOOL_MAP } from "../lib/tools";
import { ToolForm } from "./ToolForm";
import { ToolResult } from "./ToolResult";

interface TAProps {
  tool: string;
  preset?: Args;
  defaults?: Record<string, string | boolean | undefined>;
  title?: string;
  icon?: Image.ImageLike;
  /** true = open a form for the remaining arguments; false = run immediately */
  form?: boolean;
  shortcut?: Keyboard.Shortcut;
}

/** One action that runs a tool (directly, or through a generated form). */
export function ToolAction({ tool, preset = {}, defaults, title, icon = Icon.Bolt, form = false, shortcut }: TAProps) {
  const def = TOOL_MAP[tool];
  return (
    <Action.Push
      title={title ?? def.title}
      icon={icon}
      shortcut={shortcut}
      target={
        form ? (
          <ToolForm toolName={tool} preset={preset} defaults={defaults} title={title} />
        ) : (
          <ToolResult toolName={tool} args={preset} title={title} />
        )
      }
    />
  );
}

/** Everything you can do with a directory company, keyed off its slug/name. */
export function ListingActions({ item }: { item: Obj }) {
  const ref = listingRef(item);
  if (!ref) return null;
  const url = pick(item, ["profile_url", "url", "link"]);
  return (
    <>
      <ActionPanel.Section title="Company">
        <ToolAction tool="get_listing" preset={{ listing: ref }} title="View Full Profile" icon={Icon.Eye} />
        <ToolAction tool="get_relationships" preset={{ listing: ref }} title="Relationships (Pro)" icon={Icon.Network} />
        <ToolAction tool="get_news" preset={{ listing: ref }} title="Recent News (Pro)" icon={Icon.Megaphone} />
        <ToolAction tool="list_jobs" preset={{ company: ref }} title="Open Jobs (Pro)" icon={Icon.Building} />
        <ToolAction tool="compare_listings" form defaults={{ listings: ref }} title="Compare With…" icon={Icon.Switch} />
        {url && /^https?:/.test(url) && <Action.OpenInBrowser title="Open in Browser" url={url} />}
      </ActionPanel.Section>
      <ActionPanel.Section title="Your account">
        <ToolAction tool="watchlist_add" preset={{ listing: ref }} title="Add to Watchlist" icon={Icon.Star} />
        <ToolAction tool="start_lead" preset={{ listing: ref }} form title="Contact This Business" icon={Icon.Envelope} />
        <ToolAction tool="prepare_listing_claim" preset={{ listing: ref }} form title="Claim This Listing" icon={Icon.Key} />
        <Action.CopyToClipboard title="Copy Slug / Reference" content={ref} />
      </ActionPanel.Section>
    </>
  );
}
