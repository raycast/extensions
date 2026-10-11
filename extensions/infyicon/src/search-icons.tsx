import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon as RIcon,
  Keyboard,
  Toast,
  getPreferenceValues,
  open,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import React, { useState } from "react";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ATTRIBUTION,
  BASE,
  Icon,
  PAGE_SIZE,
  STYLES,
  SearchResponse,
  fetchSvg,
  iconKey,
  pageUrl,
  pngUrl,
  searchUrl,
  styleLabel,
  svgToJsx,
  svgUrl,
} from "./api";

type PrimaryAction = "copy-svg" | "paste-svg" | "copy-jsx" | "copy-png" | "download-svg" | "open";

type Preferences = {
  primaryAction: PrimaryAction;
  defaultStyle: string;
  pngSize: string;
};

const prefs = getPreferenceValues<Preferences>();

/** Same key on both platforms: ⌘ on macOS, Ctrl on Windows. */
function shortcut(key: Keyboard.KeyEquivalent, shift = true): Keyboard.Shortcut {
  const mods: Keyboard.KeyModifier[] = shift ? ["shift"] : [];
  return {
    macOS: { modifiers: ["cmd", ...mods], key },
    Windows: { modifiers: ["ctrl", ...mods], key },
  };
}

export default function Command(props: { launchContext?: { query?: string } }) {
  const [query, setQuery] = useState(props.launchContext?.query ?? "");
  const [style, setStyle] = useState(prefs.defaultStyle ?? "");
  const q = query.trim();

  const { isLoading, data, pagination } = useFetch(
    (options: { page: number }) => searchUrl(q, style, options.page * PAGE_SIZE),
    {
      execute: q.length > 0,
      keepPreviousData: true,
      initialData: [] as Icon[],
      headers: { "User-Agent": "raycast-infyicon" },
      mapResult(result: SearchResponse) {
        const icons = result.v2 ?? result.items ?? [];
        return { data: icons, hasMore: Boolean(result.hasMore) && icons.length > 0 };
      },
      failureToastOptions: { title: "Infyicon search failed" },
    },
  );

  const icons = q ? data : [];

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Medium}
      isLoading={isLoading && q.length > 0}
      pagination={pagination}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search 161,000+ free icons (e.g. shopping cart, doctor, rocket)…"
      throttle
      searchBarAccessory={
        <Grid.Dropdown tooltip="Icon style" storeValue value={style} onChange={setStyle}>
          <Grid.Dropdown.Item title="All Styles" value="" />
          {STYLES.map((s) => (
            <Grid.Dropdown.Item key={s} title={styleLabel(s)} value={s} />
          ))}
        </Grid.Dropdown>
      }
    >
      {q.length === 0 ? (
        <Grid.EmptyView
          icon={{ source: "icon.png" }}
          title="Search Infyicon"
          description="161,000+ free hand-drawn icons in outline, fill, color-outline and color-fill. Type what you need — e.g. “home”, “shopping cart”, “doctor”."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Browse Categories on Infyicon.com" url={`${BASE}/free-icons`} />
            </ActionPanel>
          }
        />
      ) : (
        icons.map((icon) => (
          <Grid.Item
            key={`${icon.style}-${iconKey(icon)}`}
            content={{ source: pngUrl(icon, 128), fallback: RIcon.Image }}
            title={icon.name}
            subtitle={styleLabel(icon.style)}
            keywords={[icon.style, ...(icon.tags ?? [])]}
            actions={<IconActions icon={icon} onSearchRelated={(name) => setQuery(name)} />}
          />
        ))
      )}
      {q.length > 0 && !isLoading && icons.length === 0 ? (
        <Grid.EmptyView
          icon={RIcon.MagnifyingGlass}
          title="No Icons Found"
          description="Try a simpler or more common word, e.g. “gear” instead of “settings cog”."
        />
      ) : null}
    </Grid>
  );
}

function IconActions({ icon, onSearchRelated }: { icon: Icon; onSearchRelated: (name: string) => void }) {
  const size = prefs.pngSize || "512";

  const actions: Record<PrimaryAction, React.ReactElement> = {
    "copy-svg": (
      <Action
        key="copy-svg"
        title="Copy SVG"
        icon={RIcon.Clipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={() => withSvg(icon, (svg) => Clipboard.copy(svg), "SVG copied")}
      />
    ),
    "paste-svg": (
      <Action
        key="paste-svg"
        title="Paste SVG"
        icon={RIcon.Text}
        shortcut={shortcut("v")}
        onAction={() => withSvg(icon, (svg) => Clipboard.paste(svg), "SVG pasted")}
      />
    ),
    "copy-jsx": (
      <Action
        key="copy-jsx"
        title="Copy JSX"
        icon={RIcon.Code}
        shortcut={shortcut("j")}
        onAction={() => withSvg(icon, (svg) => Clipboard.copy(svgToJsx(svg)), "JSX copied")}
      />
    ),
    "copy-png": (
      <Action.CopyToClipboard
        key="copy-png"
        title="Copy PNG URL"
        icon={RIcon.Image}
        content={pngUrl(icon, size)}
        shortcut={shortcut("p")}
      />
    ),
    "download-svg": (
      <Action
        key="download-svg"
        title="Download SVG"
        icon={RIcon.Download}
        shortcut={shortcut("d")}
        onAction={() => download(icon, "svg", size)}
      />
    ),
    open: (
      <Action.OpenInBrowser
        key="open"
        title="Open Icon Page"
        url={pageUrl(icon)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    ),
  };

  const order: PrimaryAction[] = ["copy-svg", "paste-svg", "copy-jsx", "copy-png", "download-svg", "open"];
  const primary: PrimaryAction = actions[prefs.primaryAction] ? prefs.primaryAction : "copy-svg";
  const rest = order.filter((k) => k !== primary);

  return (
    <ActionPanel title={`${icon.name} · ${styleLabel(icon.style)}`}>
      <ActionPanel.Section>
        {actions[primary]}
        {rest.map((k) => actions[k])}
      </ActionPanel.Section>
      <ActionPanel.Section title="More">
        <Action title="Download PNG" icon={RIcon.Download} onAction={() => download(icon, "png", size)} />
        <Action.CopyToClipboard title="Copy SVG URL" content={svgUrl(icon)} icon={RIcon.Link} />
        <Action.CopyToClipboard
          title="Copy Icon ID"
          content={iconKey(icon)}
          icon={RIcon.Tag}
          shortcut={shortcut("i")}
        />
        <Action
          title="Find Related Icons"
          icon={RIcon.MagnifyingGlass}
          shortcut={shortcut("r")}
          onAction={() => onSearchRelated(icon.name)}
        />
        <Action.CopyToClipboard title="Copy Attribution Line" content={ATTRIBUTION} icon={RIcon.Info} />
        <Action.OpenInBrowser title="Icon License" url={`${BASE}/license`} icon={RIcon.Document} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function withSvg(icon: Icon, fn: (svg: string) => Promise<void> | void, hud: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching SVG…" });
  try {
    const svg = await fetchSvg(icon);
    await fn(svg);
    await toast.hide();
    await showHUD(`${hud} — ${icon.name}`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not fetch SVG";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function download(icon: Icon, kind: "svg" | "png", size: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading ${kind.toUpperCase()}…` });
  try {
    const url = kind === "svg" ? svgUrl(icon) : pngUrl(icon, size);
    const res = await fetch(url, { headers: { "User-Agent": "raycast-infyicon" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const dir = path.join(os.homedir(), "Downloads");
    await fs.mkdir(dir, { recursive: true });
    const suffix = kind === "png" ? `_${size}px` : "";
    const file = path.join(dir, `infyicon-${iconKey(icon)}-${icon.style}${suffix}.${kind}`);
    await fs.writeFile(file, buf);
    toast.style = Toast.Style.Success;
    toast.title = "Saved to Downloads";
    toast.message = path.basename(file);
    toast.primaryAction = { title: "Show File", onAction: () => showInFinder(file) };
    toast.secondaryAction = { title: "Open", onAction: () => open(file) };
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
