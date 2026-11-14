import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import {
  FORMATS,
  PRO_URL,
  STYLES,
  hasStyle,
  isPro,
  search,
  setProData,
  svgDataUri,
  toSnippet,
  type Format,
  type IndexEntry,
  type SnippetOptions,
  type StrokeWidth,
} from "./lib";
import { loadPro } from "./pro";

const INK = { light: "#18181B", dark: "#ECEFF0" };

function IconItem({ e, opts, format }: { e: IndexEntry; opts: SnippetOptions; format: Format }) {
  const pro = isPro(opts.variant);
  const styleLabel = STYLES.find((s) => s.id === opts.variant)?.label ?? "Stroke";
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? "SVG Markup";
  // the detail pane sits on the theme background, so the large preview follows the appearance
  const preview = svgDataUri(e.name, { ...opts, size: 160 }, INK[environment.appearance]);
  return (
    <List.Item
      id={e.name}
      title={e.name}
      subtitle={e.category}
      icon={{ source: { light: svgDataUri(e.name, opts, INK.light), dark: svgDataUri(e.name, opts, INK.dark) } }}
      detail={
        <List.Item.Detail
          markdown={`![${e.name}](${preview})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={e.name} />
              <List.Item.Detail.Metadata.Label title="Component" text={e.component} />
              <List.Item.Detail.Metadata.Label title="Category" text={e.category} />
              <List.Item.Detail.Metadata.Label title="Tags" text={e.tags.join(", ")} />
              {e.aliases.length ? (
                <List.Item.Detail.Metadata.Label title="Also known as" text={e.aliases.join(", ")} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Style"
                text={pro ? `${styleLabel} (IconOven Pro)` : "Stroke (free, MIT)"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Paste title={`Paste ${formatLabel}`} content={toSnippet(e.name, format, opts)} />
          <Action.CopyToClipboard
            title="Copy SVG"
            content={toSnippet(e.name, "svg", opts)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
          />
          <Action.CopyToClipboard
            title="Copy React JSX"
            content={toSnippet(e.name, "jsx", opts)}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={e.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <ActionPanel.Section title="More formats">
            {FORMATS.filter((f) => !["svg", "jsx", "name"].includes(f.id)).map((f) => (
              <Action.CopyToClipboard key={f.id} title={`Copy ${f.label}`} content={toSnippet(e.name, f.id, opts)} />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.SearchIcons>();
  const opts: SnippetOptions = {
    variant: prefs.variant ?? "stroke",
    strokeWidth: (Number(prefs.strokeWidth) || 1.5) as StrokeWidth,
    corners: prefs.corners ?? "rounded",
  };
  const format = prefs.format ?? "svg";
  const key = prefs.licenceKey?.trim() ?? "";
  const pro = isPro(opts.variant);
  const [query, setQuery] = useState("");
  // a Pro style never falls back to Stroke: until its data is loaded the list shows why instead of icons
  const [proState, setProState] = useState<{ ready: boolean; error?: string }>({
    ready: !pro || hasStyle(opts.variant),
  });
  useEffect(() => {
    if (proState.ready) return;
    if (!key) {
      setProState({ ready: false, error: "Add your IconOven Pro licence key in the extension preferences." });
      return;
    }
    let live = true;
    loadPro(key).then((r) => {
      if (!live) return;
      if ("roles" in r) setProData({ roles: r.roles });
      setProState("roles" in r ? { ready: true } : { ready: false, error: r.error });
    });
    return () => {
      live = false;
    };
  }, [key]);
  const results = useMemo(() => (proState.ready ? search(query, 120) : []), [query, proState.ready]);
  const styleLabel = STYLES.find((s) => s.id === opts.variant)?.label ?? "Stroke";

  return (
    <List
      isShowingDetail={proState.ready && results.length > 0}
      isLoading={!proState.ready && !proState.error}
      filtering={false}
      throttle
      searchBarPlaceholder="Search IconOven icons"
      onSearchTextChange={setQuery}
    >
      {proState.error ? (
        <List.EmptyView
          icon={Icon.Lock}
          title={`${styleLabel} needs IconOven Pro`}
          description={`${proState.error} Or set Style to Stroke, which is free.`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get IconOven Pro" url={PRO_URL} />
            </ActionPanel>
          }
        />
      ) : proState.ready && results.length === 0 ? (
        <List.EmptyView title="No icons match" description="Try a shorter word, a tag or an old icon name." />
      ) : null}
      {results.map((e) => (
        <IconItem key={e.name} e={e} opts={opts} format={format} />
      ))}
    </List>
  );
}
