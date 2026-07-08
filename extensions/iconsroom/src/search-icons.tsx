// IconsRoom for Raycast — grid search over 276,000+ open source icons.
// Requires an IconsRoom lifetime license: the key lives in the extension's
// required "License Key" preference (Raycast prompts for it on first run) and
// is verified against iconsroom.com. Verification fails OPEN on network
// errors so paying users are never locked out by a blip.
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  showToast,
  Toast,
  Clipboard,
  Keyboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

const ALGOLIA_APP = "B0ACZYR9N7";
const ALGOLIA_KEY = "86274c5faf63766cd4827e4389768ab1"; // public search-only key
const CDN = "https://files.svgcdn.io";
const SITE = "https://iconsroom.com";

type LicenseState = "checking" | "ok" | "invalid";

async function verifyLicense(key: string): Promise<LicenseState> {
  if (!/^IR-[A-Z0-9-]+$/i.test(key.trim()) || key.length > 128) return "invalid";
  try {
    const res = await fetch(`${SITE}/api/v1/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: key.trim() }),
    });
    if (res.status === 200) {
      const data = (await res.json()) as { valid?: boolean };
      return data.valid ? "ok" : "invalid";
    }
    if (res.status === 400) return "invalid";
    return "ok"; // 5xx — fail open, don't lock out paying users
  } catch {
    return "ok"; // offline — fail open
  }
}

type Hit = { slug: string; collectionId: string; collectionName?: string };

async function searchIcons(query: string): Promise<{ hits: Hit[]; total: number }> {
  const res = await fetch(`https://${ALGOLIA_APP}-dsn.algolia.net/1/indexes/icons/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": ALGOLIA_APP,
      "X-Algolia-API-Key": ALGOLIA_KEY,
    },
    body: JSON.stringify({ query, hitsPerPage: 48 }),
  });
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
  const data = (await res.json()) as { hits: Hit[]; nbHits: number };
  return { hits: data.hits || [], total: data.nbHits || 0 };
}

async function fetchSvg(pack: string, name: string): Promise<string> {
  const res = await fetch(`${CDN}/${pack}/${name}.svg`);
  if (!res.ok) throw new Error(`Could not fetch ${pack}/${name}`);
  return res.text();
}

function toReactComponent(svg: string, name: string): string {
  const componentName =
    name
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("") + "Icon";
  const jsxSvg = svg
    .replace(/<svg([^>]*)>/, (m, attrs: string) => {
      const cleaned = attrs.replace(/\s(width|height)="[^"]*"/gi, "");
      return `<svg${cleaned} width={size} height={size} {...props}>`;
    })
    .replace(/class="/g, 'className="')
    .replace(
      /\s(stroke-width|stroke-linecap|stroke-linejoin|fill-rule|clip-rule|clip-path|stroke-miterlimit)=/g,
      (m, attr: string) => ` ${attr.replace(/-([a-z])/g, (x, c: string) => c.toUpperCase())}=`,
    );
  return `export function ${componentName}({ size = 24, ...props }) {\n  return (\n    ${jsxSvg}\n  );\n}\n`;
}

async function copyAs(kind: "svg" | "jsx" | "url", hit: Hit) {
  try {
    if (kind === "url") {
      await Clipboard.copy(`${CDN}/${hit.collectionId}/${hit.slug}.svg`);
    } else {
      const svg = await fetchSvg(hit.collectionId, hit.slug);
      await Clipboard.copy(kind === "jsx" ? toReactComponent(svg, hit.slug) : svg);
    }
    await showToast({ style: Toast.Style.Success, title: `Copied ${kind.toUpperCase()}` });
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Copy failed", message: String(err) });
  }
}

export default function SearchIcons() {
  const [license, setLicense] = useState<LicenseState>("checking");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const { licenseKey } = getPreferenceValues<{ licenseKey: string }>();
    verifyLicense(licenseKey || "").then(setLicense);
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) {
      setHits([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const result = await searchIcons(query.trim());
        setHits(result.hits);
        setTotal(result.total);
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  if (license !== "ok") {
    return (
      <Grid columns={7} isLoading={license === "checking"} searchBarPlaceholder="Search 276,000+ icons…">
        {license === "invalid" && (
          <Grid.EmptyView
            icon={Icon.Key}
            title="License not recognized"
            description="Enter your IconsRoom license key (IR-…) in the extension preferences — one-time purchase, yours forever."
            actions={
              <ActionPanel>
                <Action title="Enter License Key" icon={Icon.Key} onAction={openExtensionPreferences} />
                <Action.OpenInBrowser title="Get a License" url={`${SITE}/pricing?utm_source=raycast`} />
              </ActionPanel>
            }
          />
        )}
      </Grid>
    );
  }

  return (
    <Grid
      columns={7}
      isLoading={isLoading}
      searchBarPlaceholder="Search 276,000+ icons…"
      onSearchTextChange={setQuery}
      throttle
      navigationTitle={total ? `IconsRoom — ${total.toLocaleString()} matches` : "IconsRoom"}
    >
      {query.trim() === "" ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search IconsRoom"
          description="276,000+ open source icons from 220 packs"
        />
      ) : (
        hits.map((hit) => (
          <Grid.Item
            key={`${hit.collectionId}/${hit.slug}`}
            content={`${CDN}/${hit.collectionId}/${hit.slug}.svg`}
            title={hit.slug}
            subtitle={hit.collectionId}
            actions={
              <ActionPanel>
                <Action title="Copy SVG" icon={Icon.Clipboard} onAction={() => copyAs("svg", hit)} />
                <Action
                  title="Copy React Component"
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd"], key: "j" }}
                  onAction={() => copyAs("jsx", hit)}
                />
                <Action
                  title="Copy CDN URL"
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={() => copyAs("url", hit)}
                />
                <Action.OpenInBrowser
                  title="Open on IconsRoom"
                  url={`${SITE}/${hit.collectionId}/${hit.slug}?utm_source=raycast`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
