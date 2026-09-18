import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { PROVIDERS } from "../data/providers";
import { MAX_COLUMNS, MIN_COLUMNS, type ViewMode } from "../hooks/useViewMode";
import {
  docsUrl,
  fencedTemplate,
  promptSnippet,
  PROVIDER_ORDER,
  rawTemplate,
  shadcnAddCommand,
  shadcnPreviewUrl,
  shadcnVariants,
  type ChartType,
  type Provider,
} from "../lib/catalog";
import ChartDetail from "./ChartDetail";
import RenderView from "./RenderView";

function shortcut(key: Keyboard.KeyEquivalent, ...extra: Keyboard.KeyModifier[]): Keyboard.Shortcut {
  return { modifiers: ["cmd", ...extra], key };
}

/** What the other providers' copies are called: the example is syntax, an option or a component. */
const TEMPLATE_NOUN: Record<Provider, string> = { mermaid: "Template", echarts: "Option", shadcn: "Component" };

export interface ChartActionsProps {
  chart: ChartType;
  /** The provider whose content the view shows and the primary actions follow. */
  provider: Provider;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => Promise<boolean>;
  /** Called when the type is opened or copied from, so it joins the Recent section. */
  onUse: (id: string) => Promise<void>;
  /** Present in the browse views, absent on the chart page itself. */
  browse?: {
    onClearRecent?: () => Promise<void>;
    viewMode: ViewMode;
    onSwitchView: () => void;
    showDetail: boolean;
    onToggleDetail: () => void;
    columns: number;
    onColumnsChange: (columns: number) => void;
  };
}

export default function ChartActions(props: ChartActionsProps) {
  const { chart, provider, isFavorite, onToggleFavorite, onUse, browse } = props;
  const docs = docsUrl(chart, provider);
  const fenced = fencedTemplate(chart, provider);
  const raw = rawTemplate(chart, provider);
  const addCommand = chart.shadcn ? shadcnAddCommand(chart.shadcn.block) : undefined;
  const preview = shadcnPreviewUrl(chart);
  const variants = shadcnVariants(chart);
  // With the list panel open the page would repeat what is already on screen, so Enter goes to the docs.
  const docsFirst = !browse || (browse.viewMode === "list" && browse.showDetail);
  const others = PROVIDER_ORDER.filter((other) => other !== provider && chart[other]);
  // The chart page is pushed with a snapshot of the flag, so the title follows a local copy.
  const [favorite, setFavorite] = useState(isFavorite);
  useEffect(() => setFavorite(isFavorite), [isFavorite]);

  // Recording a use is bookkeeping; a storage failure must not stop the copy or open it follows.
  function used() {
    onUse(chart.id).catch((error) => showFailureToast(error, { title: "Could not update recent" }));
  }

  async function clearRecent() {
    try {
      await browse?.onClearRecent?.();
      await showToast({ style: Toast.Style.Success, title: "Cleared Recent" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not clear recent" });
    }
  }

  async function toggleFavorite() {
    try {
      const nowFavorite = await onToggleFavorite(chart.id);
      setFavorite(nowFavorite);
      await showToast({
        style: Toast.Style.Success,
        title: nowFavorite ? "Added to Favorites" : "Removed from Favorites",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not update favorites" });
    }
  }

  const openDocs = docs && <Action.OpenInBrowser title="Open Docs" url={docs} onOpen={used} />;

  const shadcnCopies = addCommand && (
    <>
      <Action.CopyToClipboard
        title="Copy Install Command"
        content={addCommand}
        shortcut={shortcut("i", "shift")}
        onCopy={used}
      />
      {variants.length > 1 && (
        <ActionPanel.Submenu title="Copy Variant Install Command…" icon={Icon.Terminal}>
          {variants.map((block) => (
            <Action.CopyToClipboard
              key={block.name}
              title={block.title}
              content={shadcnAddCommand(block.name)}
              onCopy={used}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      {variants.length > 1 && (
        <ActionPanel.Submenu title="Copy Variant Component…" icon={Icon.Code}>
          {variants.map((block) => (
            <Action.CopyToClipboard
              key={block.name}
              title={block.title}
              content={"```tsx\n" + block.source + "\n```"}
              onCopy={used}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );

  return (
    <ActionPanel title={chart.name}>
      <ActionPanel.Section>
        {docsFirst && openDocs}
        {browse && (
          <Action.Push
            title="Show Chart"
            icon={Icon.Eye}
            target={
              <ChartDetail
                chart={chart}
                provider={provider}
                isFavorite={favorite}
                onToggleFavorite={onToggleFavorite}
                onUse={onUse}
              />
            }
            onPush={used}
          />
        )}
        {!docsFirst && openDocs}
        {provider !== "shadcn" && raw && (
          <Action.Push
            title="Render Template"
            icon={Icon.Image}
            shortcut={shortcut("r", "shift")}
            target={<RenderView source={{ kind: provider, text: raw }} title={chart.name} />}
            onPush={used}
          />
        )}
        {provider === "shadcn" && preview && (
          <Action.OpenInBrowser
            title="Open Preview"
            icon={Icon.Image}
            shortcut={shortcut("r", "shift")}
            url={preview}
            onOpen={used}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {docs && (
          <Action.CopyToClipboard
            title="Copy Docs Link"
            content={docs}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onCopy={used}
          />
        )}
        {fenced && (
          <Action.CopyToClipboard
            title="Copy Template"
            content={fenced}
            shortcut={shortcut("t", "shift")}
            onCopy={used}
          />
        )}
        {raw && (
          <Action.CopyToClipboard
            title="Copy Raw Template"
            content={raw}
            shortcut={shortcut("t", "opt")}
            onCopy={used}
          />
        )}
        <Action.CopyToClipboard
          title="Copy Prompt Snippet"
          content={promptSnippet(chart, provider)}
          shortcut={shortcut("p", "shift")}
          onCopy={used}
        />
        {provider === "shadcn" && shadcnCopies}
      </ActionPanel.Section>

      <ActionPanel.Section title="Libraries">
        {others.map((other) => (
          <Action.OpenInBrowser
            key={`docs-${other}`}
            title={`Open ${PROVIDERS[other].title} ${other === "shadcn" ? "Example" : "Docs"}`}
            url={docsUrl(chart, other) ?? ""}
            onOpen={used}
          />
        ))}
        {others.map((other) => (
          <Action.CopyToClipboard
            key={`copy-${other}`}
            title={`Copy ${PROVIDERS[other].title} ${TEMPLATE_NOUN[other]}`}
            content={fencedTemplate(chart, other) ?? ""}
            onCopy={used}
          />
        ))}
        {others
          .filter((other) => other !== "shadcn")
          .map((other) => (
            <Action.Push
              key={`render-${other}`}
              title={`Render ${PROVIDERS[other].title} ${TEMPLATE_NOUN[other]}`}
              icon={Icon.Image}
              target={<RenderView source={{ kind: other, text: rawTemplate(chart, other) ?? "" }} title={chart.name} />}
              onPush={used}
            />
          ))}
        {provider !== "shadcn" && shadcnCopies}
      </ActionPanel.Section>

      <ActionPanel.Section title="Catalog">
        <Action
          title={favorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={toggleFavorite}
        />
        {browse && (
          <Action
            title={browse.viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
            icon={browse.viewMode === "grid" ? Icon.List : Icon.AppWindowGrid3x3}
            shortcut={shortcut("l", "shift")}
            onAction={browse.onSwitchView}
          />
        )}
        {browse && browse.viewMode === "list" && (
          <Action
            title={browse.showDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={shortcut("d", "shift")}
            onAction={browse.onToggleDetail}
          />
        )}
        {browse && browse.viewMode === "grid" && browse.columns > MIN_COLUMNS && (
          <Action
            title="Larger Tiles"
            icon={Icon.Maximize}
            shortcut={shortcut("=")}
            onAction={() => browse.onColumnsChange(browse.columns - 1)}
          />
        )}
        {browse && browse.viewMode === "grid" && browse.columns < MAX_COLUMNS && (
          <Action
            title="Smaller Tiles"
            icon={Icon.Minimize}
            shortcut={shortcut("-")}
            onAction={() => browse.onColumnsChange(browse.columns + 1)}
          />
        )}
        {browse?.onClearRecent && (
          <Action
            title="Clear Recent"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={clearRecent}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
