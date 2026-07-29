import React, { useEffect, useState } from "react";
import {
  ActionPanel,
  Form,
  List,
  Action,
  showToast,
  Toast,
  open,
  LocalStorage,
  useNavigation,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Application,
} from "@raycast/api";
import { exec } from "child_process";
import { Variant, LinkItem, BROWSER_OPTIONS, BROWSER_MODE_OPTIONS } from "./types";

const RAYCAST_DEEPLINK_BASE = "raycast://extensions/konatek1993/multiple-quicklinks/multiple-quicklinks";

/** Normalize stored links to LinkItem[] (supports old string[] and legacy browser field). */
function normalizeLinks(links: LinkItem[] | string[], fallbackBrowser?: string): LinkItem[] {
  if (!Array.isArray(links)) return [];
  return links.map((item) =>
    typeof item === "string"
      ? { url: item.trim(), browser: fallbackBrowser || undefined }
      : { url: (item as LinkItem).url.trim(), browser: (item as LinkItem).browser || fallbackBrowser || undefined },
  );
}

function buildVariantQuicklinkUrl(variantId: string): string {
  const context = encodeURIComponent(JSON.stringify({ variantId }));
  return `${RAYCAST_DEEPLINK_BASE}?context=${context}`;
}

type LaunchContext = { variantId?: string };

export function Mql1(props: { launchContext?: LaunchContext }) {
  const variantIdFromContext = props.launchContext?.variantId;
  const [variants, setVariants] = useState<Variant[]>([]);

  // Load variants from LocalStorage (normal list view)
  useEffect(() => {
    if (variantIdFromContext) return;
    const loadVariants = async () => {
      const storedVariants = await LocalStorage.getItem<string>("variants");
      if (storedVariants) {
        const parsed: Variant[] = JSON.parse(storedVariants);
        const normalized = parsed.map((v) => ({
          ...v,
          links: normalizeLinks(v.links, (v as Variant & { browser?: string }).browser),
          browserMode: (v as Variant).browserMode ?? "per_config",
        }));
        setVariants(normalized);
      }
    };
    loadVariants();
  }, [variantIdFromContext]);

  // Save variants to LocalStorage
  const saveVariants = async (newVariants: Variant[]) => {
    setVariants(newVariants);
    await LocalStorage.setItem("variants", JSON.stringify(newVariants));
  };

  const addVariant = async (
    name: string,
    linkItems: LinkItem[],
    configBrowser?: string,
    browserMode?: Variant["browserMode"],
  ) => {
    const links = linkItems
      .filter((l) => l.url.trim())
      .map((l) => ({ url: l.url.trim(), browser: l.browser || undefined }));
    const newVariant: Variant = {
      id: Date.now().toString(),
      name,
      links,
      browser: configBrowser || undefined,
      browserMode: browserMode ?? "per_config",
    };
    const updatedVariants = [...variants, newVariant];
    await saveVariants(updatedVariants);
    showToast(Toast.Style.Success, "Variant added!");
  };

  const editVariant = async (
    id: string,
    name: string,
    linkItems: LinkItem[],
    configBrowser?: string,
    browserMode?: Variant["browserMode"],
  ) => {
    const links = linkItems
      .filter((l) => l.url.trim())
      .map((l) => ({ url: l.url.trim(), browser: l.browser || undefined }));
    const updatedVariants = variants.map((v) =>
      v.id === id ? { ...v, name, links, browser: configBrowser, browserMode: browserMode ?? "per_config" } : v,
    );
    await saveVariants(updatedVariants);
    showToast(Toast.Style.Success, "Variant updated!");
  };

  const deleteVariant = async (id: string) => {
    const updatedVariants = variants.filter((variant) => variant.id !== id);
    await saveVariants(updatedVariants);
    showToast(Toast.Style.Success, "Variant deleted!");
  };

  const runHotkey = (modifiers: string[], key: string) => {
    console.log({ modifiers, key });
    if (modifiers.length === 0 || !key) {
      showToast(Toast.Style.Failure, "No modifiers or key found");
      return;
    }

    const appleScript = `
    tell application "System Events"
      keystroke "${key}" using {${modifiers.map((modifier) => `${modifier} down`).join(", ")}}
    end tell
  `;
    // console.log(appleScript)
    exec(`osascript -e '${appleScript}'`, (error) => {
      if (error) {
        showToast(Toast.Style.Failure, `Failed to run hotkey: ${modifiers.join("+")}${key}`);
      } else {
        showToast(Toast.Style.Success, "Resources opened!");
      }
    });
  };

  const serializeModifier = (modifier: string) => {
    modifier = modifier.toLowerCase().trim();

    if (modifier === "option" || modifier === "opt" || modifier === "⌥") {
      return "option";
    }
    if (modifier === "command" || modifier === "cmd" || modifier === "⌘") {
      return "command";
    }
    if (modifier === "control" || modifier === "ctrl" || modifier === "⌃") {
      return "control";
    }
    if (modifier === "shift" || modifier === "⇧") {
      return "shift";
    }
    return modifier;
  };

  const openLinks = async (links: LinkItem[], variant?: Variant) => {
    const prefs = getPreferenceValues<{ fallbackBrowser?: { path: string; name: string; bundleId?: string } }>();
    const mode = variant?.browserMode ?? "per_config";

    const isWebUrlForBatch = (url: string) => {
      return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("www.");
    };

    type BrowserApp = Application | string | undefined;

    const browserAppForItem = (item: LinkItem): BrowserApp => {
      if (mode === "per_link") return item.browser || prefs.fallbackBrowser;
      if (mode === "per_config") return variant?.browser || prefs.fallbackBrowser;
      return prefs.fallbackBrowser;
    };

    const browserBundleId = (browserApp: BrowserApp): string | undefined => {
      if (!browserApp) return undefined;
      if (typeof browserApp === "string") return browserApp;
      return browserApp.bundleId;
    };

    const appleScriptAppNameForBundleId = (bundleId: string | undefined): string | undefined => {
      switch (bundleId) {
        case "com.apple.Safari":
          return "Safari";
        case "com.google.Chrome":
          return "Google Chrome";
        case "company.thebrowser.Browser":
          return "Brave Browser";
        case "com.microsoft.edgemac":
          return "Microsoft Edge";
        default:
          return undefined;
      }
    };

    const escapeAppleScriptString = (s: string) => {
      return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    };

    const escapeForShellSingleQuotes = (s: string) => {
      // Pass arbitrary AppleScript using: osascript -e '<script>'
      return s.replace(/'/g, `'\\''`);
    };

    const execAppleScript = (appleScript: string) => {
      const shellSafeScript = escapeForShellSingleQuotes(appleScript);
      return new Promise<void>((resolve, reject) => {
        exec(`osascript -e '${shellSafeScript}'`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    };

    const openWebUrlsInNewWindow = async (browserApp: BrowserApp, urlsInOrder: string[]) => {
      if (urlsInOrder.length === 0) return;

      const bundleId = browserBundleId(browserApp);
      const appleAppName = appleScriptAppNameForBundleId(bundleId);

      // Fallback: if we can't batch via AppleScript, open sequentially with Raycast `open`.
      if (!appleAppName) {
        for (const u of urlsInOrder) {
          await open(u, browserApp);
        }
        return;
      }

      const firstUrl = escapeAppleScriptString(urlsInOrder[0]);
      const restUrls = urlsInOrder.slice(1).map((u) => escapeAppleScriptString(u));
      const restUrlsArrayLiteral = restUrls.length > 0 ? `{${restUrls.map((u) => `"${u}"`).join(", ")}}` : `{}`;

      const script =
        appleAppName === "Safari"
          ? `
tell application "Safari"
  activate
  set first_url to "${firstUrl}"
  make new document at end of documents with properties {URL:first_url}
  ${
    restUrls.length > 0
      ? `
  tell window 1
    set rest_urls to ${restUrlsArrayLiteral}
    repeat with the_url in rest_urls
      make new tab at end of tabs with properties {URL:the_url}
    end repeat
  end tell
`
      : ""
  }
end tell
`
          : `
tell application "${appleAppName}"
  activate
  make new window
  tell window 1
    set URL of tab 1 to "${firstUrl}"
    ${
      restUrls.length > 0
        ? `
    set rest_urls to ${restUrlsArrayLiteral}
    repeat with the_url in rest_urls
      make new tab at end of tabs with properties {URL:the_url}
    end repeat
`
        : ""
    }
  end tell
end tell
`;

      try {
        await execAppleScript(script);
      } catch (e) {
        showToast(
          Toast.Style.Failure,
          `Failed to open tabs in new window for ${appleAppName}. Falling back to sequential open.`,
        );
        for (const u of urlsInOrder) {
          await open(u, browserApp);
        }
      }
    };

    // Open web URLs in batches; everything else (hotkeys/other links) keeps previous behavior/order.
    const pendingByBrowserKey = new Map<string, { browserApp: BrowserApp; urls: string[] }>();
    const pendingBrowserOrder: string[] = [];

    const flushPending = async () => {
      for (const key of pendingBrowserOrder) {
        const pending = pendingByBrowserKey.get(key);
        if (!pending) continue;
        await openWebUrlsInNewWindow(pending.browserApp, pending.urls);
      }
      pendingByBrowserKey.clear();
      pendingBrowserOrder.length = 0;
    };

    for (const item of links) {
      const trimmedLink = item.url.trim();
      if (!trimmedLink) continue;

      const browserApp = browserAppForItem(item);

      const webBatchKey = (() => {
        const bundleId = browserBundleId(browserApp);
        return bundleId ? `bundle:${bundleId}` : "bundle:__default__";
      })();

      // Batchable web URLs: open them together in a newly created browser window (with tabs).
      if (isWebUrlForBatch(trimmedLink)) {
        const existing = pendingByBrowserKey.get(webBatchKey);
        if (existing) existing.urls.push(trimmedLink);
        else {
          pendingByBrowserKey.set(webBatchKey, { browserApp, urls: [trimmedLink] });
          pendingBrowserOrder.push(webBatchKey);
        }
        continue;
      }

      // Non-web batch items must be processed in order.
      await flushPending();

      if (
        (trimmedLink.startsWith("{") && trimmedLink.split("{")[1]?.trim().startsWith("hotkey:")) ||
        trimmedLink.split("{")[1]?.trim().startsWith("hotkeys:")
      ) {
        // hotkeys with brackets:
        const keystrokes = trimmedLink.split("{")[1].split(":")[1].slice(0, -1);
        const splitKeystrokes = keystrokes.split("+");
        const key = splitKeystrokes.length > 1 ? splitKeystrokes[splitKeystrokes.length - 1].toLowerCase().trim() : "";
        const modifiers = splitKeystrokes
          .slice(0, splitKeystrokes.length - 1)
          .map((modifier) => serializeModifier(modifier));
        runHotkey(modifiers, key);
      } else if (trimmedLink.startsWith("hotkey:")) {
        // hotkeys without brackets (with hotkey: keyword):
        const keystrokes = trimmedLink.split(":");
        const splitKeystrokes = keystrokes[1].split("+");
        const key = splitKeystrokes.length > 1 ? splitKeystrokes[splitKeystrokes.length - 1].toLowerCase().trim() : "";
        const modifiers = splitKeystrokes
          .slice(0, splitKeystrokes.length - 1)
          .map((modifier) => serializeModifier(modifier));
        runHotkey(modifiers, key);
      } else if (trimmedLink.endsWith(".app")) {
        // Keep previous behavior for app targets.
        await open(trimmedLink, browserApp);
      } else if (trimmedLink) {
        exec(`open "${trimmedLink}"`, (error) => {
          if (error) {
            showToast(Toast.Style.Failure, `Failed to open: ${trimmedLink}`);
          }
        });
      }
    }

    await flushPending();
  };

  // When launched via quicklink (variantId in context): run openLinks for that variant and close
  useEffect(() => {
    if (!variantIdFromContext) return;
    let cancelled = false;
    const run = async () => {
      const stored = await LocalStorage.getItem<string>("variants");
      const all: (Variant & { browser?: string })[] = stored ? JSON.parse(stored) : [];
      const raw = all.find((v) => v.id === variantIdFromContext);
      if (cancelled) return;
      if (!raw) {
        showToast(Toast.Style.Failure, "Variant not found");
        return;
      }
      const variant = {
        ...raw,
        links: normalizeLinks(raw.links, raw.browser),
        browserMode: raw.browserMode ?? "per_config",
      };
      await openLinks(variant.links, variant);
      showToast(Toast.Style.Success, "Links opened!");
      await closeMainWindow();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [variantIdFromContext]);

  // When opened via quicklink, show brief "Opening..." and let the effect run
  if (variantIdFromContext) {
    return <Detail markdown="Opening links…" />;
  }

  return (
    <List>
      {variants.map((variant) => (
        <List.Item
          key={variant.id}
          title={variant.name}
          subtitle={`${variant.links.length} link(s) · ID: ${variant.id}`}
          actions={
            <ActionPanel>
              <Action title="Open Links" onAction={() => openLinks(variant.links, variant)} />
              <Action.CreateQuicklink
                title="Add Quicklink"
                quicklink={{
                  name: variant.name,
                  link: buildVariantQuicklinkUrl(variant.id),
                }}
              />
              <Action.CopyToClipboard
                title="Copy Quicklink URL"
                content={buildVariantQuicklinkUrl(variant.id)}
                onCopy={() => showToast(Toast.Style.Success, "Quicklink URL copied")}
              />
              <Action.Push
                title="Edit Variant"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditVariantForm variant={variant} onSubmit={editVariant} />}
              />
              <Action
                title="Delete Variant"
                style={Action.Style.Destructive}
                onAction={() => deleteVariant(variant.id)}
              />
              <Action.Push
                title="Add Variant"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AddVariantForm onSubmit={addVariant} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Add New Variant"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Variant"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddVariantForm onSubmit={addVariant} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function AddVariantForm({
  onSubmit,
}: {
  onSubmit: (name: string, linkItems: LinkItem[], configBrowser?: string, browserMode?: Variant["browserMode"]) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [browserMode, setBrowserMode] = useState<Variant["browserMode"]>("per_config");
  const [linkItems, setLinkItems] = useState<Array<{ url: string; browser: string }>>([
    { url: "", browser: "" },
    { url: "", browser: "" },
  ]);
  const [configBrowser, setConfigBrowser] = useState("");

  const handleSubmit = () => {
    const items: LinkItem[] =
      browserMode === "per_link"
        ? linkItems.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), browser: l.browser || undefined }))
        : linkItems.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim() }));
    onSubmit(name, items, browserMode === "per_config" ? configBrowser || undefined : undefined, browserMode);
    pop();
  };

  const addRow = () => setLinkItems((prev) => [...prev, { url: "", browser: "" }]);
  const removeLastRow = () => setLinkItems((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const descriptionText =
    browserMode === "per_link"
      ? "One config = many links. Press ⌘N to add a URL row. Set browser per link."
      : browserMode === "per_config"
        ? "One config = many links. Press ⌘N to add a URL. One browser for all links below."
        : "One config = many links. Press ⌘N to add a URL. Browser = global Fallback.";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="➕ Add URL" onAction={addRow} shortcut={{ modifiers: ["cmd"], key: "n" }} />
          {linkItems.length > 1 && <Action title="Remove Last URL" onAction={removeLastRow} />}
          <Action.SubmitForm title="Save Variant" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Config Name" value={name} onChange={setName} placeholder="e.g. Work links" />
      <Form.Dropdown
        id="browserMode"
        title="Browser selection for this config"
        value={browserMode ?? "per_config"}
        onChange={(v) => setBrowserMode(v as Variant["browserMode"])}
        storeValue={false}
      >
        {BROWSER_MODE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} />
        ))}
      </Form.Dropdown>
      {browserMode === "per_config" && (
        <Form.Dropdown
          id="configBrowser"
          title="Browser (for all links in this config)"
          value={configBrowser}
          onChange={setConfigBrowser}
          storeValue={false}
        >
          {BROWSER_OPTIONS.map((opt: { title: string; value: string }) => (
            <Form.Dropdown.Item key={opt.value || "default"} title={opt.title} value={opt.value} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title="Multiple URLs" text={descriptionText} />
      {linkItems.map((item, i) => (
        <React.Fragment key={`row-${i}`}>
          <Form.TextField
            id={`link-${i}`}
            title={`Link ${i + 1} — URL`}
            placeholder="https://..."
            value={item.url}
            onChange={(v) =>
              setLinkItems((prev) => {
                const n = [...prev];
                n[i] = { ...n[i], url: v };
                return n;
              })
            }
          />
          {browserMode === "per_link" && (
            <Form.Dropdown
              id={`browser-${i}`}
              title={`Link ${i + 1} — Browser`}
              value={item.browser}
              onChange={(v) =>
                setLinkItems((prev) => {
                  const n = [...prev];
                  n[i] = { ...n[i], browser: v };
                  return n;
                })
              }
              storeValue={false}
            >
              {BROWSER_OPTIONS.map((opt: { title: string; value: string }) => (
                <Form.Dropdown.Item key={opt.value || "default"} title={opt.title} value={opt.value} />
              ))}
            </Form.Dropdown>
          )}
        </React.Fragment>
      ))}
    </Form>
  );
}

function EditVariantForm({
  variant,
  onSubmit,
}: {
  variant: Variant;
  onSubmit: (
    id: string,
    name: string,
    linkItems: LinkItem[],
    configBrowser?: string,
    browserMode?: Variant["browserMode"],
  ) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(variant.name);
  const [browserMode, setBrowserMode] = useState<Variant["browserMode"]>(variant.browserMode ?? "per_config");
  const [linkItems, setLinkItems] = useState<Array<{ url: string; browser: string }>>(
    variant.links.length > 0
      ? variant.links.map((l) => ({ url: l.url, browser: l.browser ?? "" }))
      : [{ url: "", browser: "" }],
  );
  const [configBrowser, setConfigBrowser] = useState(variant.browser ?? "");

  const handleSubmit = () => {
    const items: LinkItem[] =
      browserMode === "per_link"
        ? linkItems.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), browser: l.browser || undefined }))
        : linkItems.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim() }));
    onSubmit(
      variant.id,
      name,
      items,
      browserMode === "per_config" ? configBrowser || undefined : undefined,
      browserMode,
    );
    pop();
  };

  const addRow = () => setLinkItems((prev) => [...prev, { url: "", browser: "" }]);
  const removeLastRow = () => setLinkItems((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const descriptionText =
    browserMode === "per_link"
      ? "Press ⌘N to add a URL row. Set browser per link."
      : browserMode === "per_config"
        ? "Press ⌘N to add a URL. One browser for all links below."
        : "Press ⌘N to add a URL. Browser = global Fallback.";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="➕ Add URL" onAction={addRow} shortcut={{ modifiers: ["cmd"], key: "n" }} />
          {linkItems.length > 1 && <Action title="Remove Last URL" onAction={removeLastRow} />}
          <Action.SubmitForm title="Update Variant" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Config Name" value={name} onChange={setName} placeholder="e.g. Work links" />
      <Form.Dropdown
        id="browserMode"
        title="Browser selection for this config"
        value={browserMode ?? "per_config"}
        onChange={(v) => setBrowserMode(v as Variant["browserMode"])}
        storeValue={false}
      >
        {BROWSER_MODE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} />
        ))}
      </Form.Dropdown>
      {browserMode === "per_config" && (
        <Form.Dropdown
          id="configBrowser"
          title="Browser (for all links in this config)"
          value={configBrowser}
          onChange={setConfigBrowser}
          storeValue={false}
        >
          {BROWSER_OPTIONS.map((opt: { title: string; value: string }) => (
            <Form.Dropdown.Item key={opt.value || "default"} title={opt.title} value={opt.value} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title="Multiple URLs" text={descriptionText} />
      {linkItems.map((item, i) => (
        <React.Fragment key={`row-${i}`}>
          <Form.TextField
            id={`link-${i}`}
            title={`Link ${i + 1} — URL`}
            placeholder="https://..."
            value={item.url}
            onChange={(v) =>
              setLinkItems((prev) => {
                const n = [...prev];
                n[i] = { ...n[i], url: v };
                return n;
              })
            }
          />
          {browserMode === "per_link" && (
            <Form.Dropdown
              id={`browser-${i}`}
              title={`Link ${i + 1} — Browser`}
              value={item.browser}
              onChange={(v) =>
                setLinkItems((prev) => {
                  const n = [...prev];
                  n[i] = { ...n[i], browser: v };
                  return n;
                })
              }
              storeValue={false}
            >
              {BROWSER_OPTIONS.map((opt: { title: string; value: string }) => (
                <Form.Dropdown.Item key={opt.value || "default"} title={opt.title} value={opt.value} />
              ))}
            </Form.Dropdown>
          )}
        </React.Fragment>
      ))}
    </Form>
  );
}
