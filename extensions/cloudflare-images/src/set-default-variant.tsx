import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  listVariants,
  type CloudflareVariant,
  type CloudflareVariantOptions,
} from "@mcdays/cloudflare-images-core";
import { getPreferences } from "./lib/config.js";
import {
  clearStoredDefaultVariant,
  getStoredDefaultVariant,
  setStoredDefaultVariant,
} from "./lib/variant.js";

/**
 * "Set Default Variant" — V0.2.1.
 *
 * Fetches variants from the user's Cloudflare Images account (live, on
 * every open) and renders them as a Raycast list. Selecting one stores
 * `/<id>` in `LocalStorage`; that stored value then wins over the
 * preference textfield for every upload / browse command. A "Clear stored
 * default" action reverts to the textfield fallback.
 *
 * Why a separate command instead of a manifest dropdown? Raycast preference
 * dropdowns are static — declared at manifest time. The variants a given
 * account has aren't known until we hit the API, so we render them in a
 * proper view instead.
 */
export default function SetDefaultVariantCommand() {
  const prefs = getPreferences();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "loaded"; variants: CloudflareVariant[]; stored: string | null }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ kind: "loading" });

      // Surface credential gaps before hitting the API.
      if (!prefs.accountId?.trim() || !prefs.apiToken?.trim()) {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              "Cloudflare credentials are missing. Open extension preferences (⌘ ,) and fill in Account ID and API Token first.",
          });
        }
        return;
      }

      try {
        const [variants, stored] = await Promise.all([
          listVariants({
            accountId: prefs.accountId,
            apiToken: prefs.apiToken,
          }),
          getStoredDefaultVariant(),
        ]);
        if (!cancelled) {
          setState({ kind: "loaded", variants, stored });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state.kind === "error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't fetch your variants"
          description={state.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => setReloadKey((k) => k + 1)}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action.OpenInBrowser
                title="Cloudflare Images Variants"
                url="https://dash.cloudflare.com/?to=/:account/images/variants"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const isLoading = state.kind === "loading";
  const variants = state.kind === "loaded" ? state.variants : [];
  const stored = state.kind === "loaded" ? state.stored : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter variants…"
      // Surface the currently-stored default in the nav title when one
      // exists — that's genuine context. Without one, leave Raycast to
      // auto-fill from the command name.
      navigationTitle={stored ? `Default variant: ${stored}` : undefined}
    >
      {variants.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Image}
          title="No variants found"
          description="Your account has no variants configured. Create at least one in the Cloudflare dashboard, then reload."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Cloudflare Images Variants"
                url="https://dash.cloudflare.com/?to=/:account/images/variants"
                icon={Icon.Globe}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => setReloadKey((k) => k + 1)}
              />
            </ActionPanel>
          }
        />
      ) : (
        variants.map((variant) => {
          const variantPath = `/${variant.id}`;
          const isStored = stored === variantPath;
          return (
            <List.Item
              key={variant.id}
              title={variant.id}
              subtitle={summariseOptions(variant.options)}
              icon={isStored ? Icon.CheckCircle : Icon.Circle}
              accessories={[
                isStored
                  ? { tag: { value: "Default", color: Color.Green } }
                  : variant.neverRequireSignedURLs
                    ? {
                        tag: {
                          value: "Always unsigned",
                          color: Color.SecondaryText,
                        },
                      }
                    : {},
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      isStored
                        ? "Already the Default"
                        : `Set ${variant.id} as Default`
                    }
                    icon={Icon.Star}
                    onAction={async () => {
                      if (isStored) return;
                      await setStoredDefaultVariant(variantPath);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Default variant updated",
                        message: `${variant.id} will be used for all uploads.`,
                      });
                      setReloadKey((k) => k + 1);
                    }}
                  />
                  {stored && (
                    <Action
                      title="Clear Stored Default"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "x" }}
                      onAction={async () => {
                        await clearStoredDefaultVariant();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Cleared stored default",
                          message:
                            "Falls back to the Default Variant textfield in preferences.",
                        });
                        setReloadKey((k) => k + 1);
                      }}
                    />
                  )}
                  <Action
                    title="Reload Variants"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => setReloadKey((k) => k + 1)}
                  />
                  <Action.OpenInBrowser
                    title="Edit Variants in Cloudflare Dashboard"
                    url="https://dash.cloudflare.com/?to=/:account/images/variants"
                    icon={Icon.Globe}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function summariseOptions(opts: CloudflareVariantOptions): string {
  const parts: string[] = [];
  if (opts.width && opts.height) {
    parts.push(`${opts.width}×${opts.height}`);
  } else if (opts.width) {
    parts.push(`w:${opts.width}`);
  } else if (opts.height) {
    parts.push(`h:${opts.height}`);
  }
  if (opts.fit) parts.push(opts.fit);
  if (opts.metadata) parts.push(`metadata: ${opts.metadata}`);
  return parts.join(" · ") || "no transformations";
}
