import { ActionPanel, Action, Grid, showToast, Toast, LocalStorage, Color } from "@raycast/api";
import { useState, useEffect } from "react";

// GitLab's icon set (@gitlab/svgs) is previewed at https://design.gitlab.com/svgs/.
// The full icon set ships as a single SVG sprite sheet of <symbol> elements.
const SPRITE_URL = "https://unpkg.com/@gitlab/svgs/dist/icons.svg";
const PREVIEW_BASE_URL = "https://design.gitlab.com/svgs/";

const CACHE_KEY = "GitLabSvgs.sprite";

export default function Command() {
  const { icons, isLoading } = useIcons();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search GitLab icons..."
      columns={8}
      inset={Grid.Inset.Large}
      onSelectionChange={setSelectedId}
      navigationTitle={selectedId ? `GitLab Icons – ${selectedId}` : "GitLab Icons"}
      throttle
    >
      <Grid.Section title="Icons" subtitle={icons.length + ""}>
        {icons.map((icon) => (
          <Grid.Item
            key={icon.name}
            id={icon.name}
            content={{ source: icon.dataUri, tintColor: Color.PrimaryText }}
            keywords={icon.keywords}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Icon Name" content={icon.name} />
                <Action.CopyToClipboard title="Copy SVG Markup" content={icon.svg} />
                <Action.OpenInBrowser
                  title="Open Preview"
                  url={`${PREVIEW_BASE_URL}?q=${encodeURIComponent(icon.name)}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

interface Icon {
  name: string;
  svg: string;
  dataUri: string;
  keywords: string[];
}

function useIcons() {
  const [icons, setIcons] = useState<Icon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sprite = await loadSprite();
        const parsed = parseSprite(sprite);
        if (!cancelled) {
          setIcons(parsed);
          setIsLoading(false);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
        console.error("svgs error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not load icons", message: String(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { icons, isLoading };
}

async function loadSprite(): Promise<string> {
  const cached = (await LocalStorage.getItem<string>(CACHE_KEY)) || "";
  if (cached) {
    return cached;
  }

  const response = await fetch(SPRITE_URL);
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const sprite = await response.text();
  await LocalStorage.setItem(CACHE_KEY, sprite);
  return sprite;
}

// Square canvas every icon is drawn onto.
const CANVAS = 32;

function renderIcon(viewBox: string, inner: string): string {
  const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" style="transform: translate(-12.5%, -12.5%);">`;

  const [x, y, width, height] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (![x, y, width, height].every((value) => Number.isFinite(value)) || width <= 0 || height <= 0) {
    return `${header}${inner}</svg>`;
  }

  // Keep the icon at its natural size, only shrinking it if it would not fit.
  const scale = Math.min(1, CANVAS / Math.max(width, height));
  const translateX = round((CANVAS - width * scale) / 2 - x * scale);
  const translateY = round((CANVAS - height * scale) / 2 - y * scale);
  const resize = scale === 1 ? "" : ` scale(${round(scale)})`;

  return `${header}<g transform="translate(${translateX} ${translateY})${resize}">${inner}</g></svg>`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parseSprite(sprite: string): Icon[] {
  const icons: Icon[] = [];
  const symbolRegex = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;

  let match: RegExpExecArray | null;
  while ((match = symbolRegex.exec(sprite)) !== null) {
    const attributes = match[1];
    const inner = match[2];

    const idMatch = attributes.match(/id="([^"]+)"/);
    if (!idMatch) {
      continue;
    }
    const name = idMatch[1];

    const viewBoxMatch = attributes.match(/viewBox="([^"]+)"/);
    const svg = renderIcon(viewBoxMatch ? viewBoxMatch[1] : "0 0 16 16", inner);
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

    // Allow searching with spaces (or no separator) for hyphenated names,
    // e.g. "chevron lg" or "chevronlg" should match "chevron-lg-left".
    const parts = name.split(/[-_]/).filter(Boolean);
    const keywords = Array.from(new Set([...parts, name.replace(/[-_]/g, " "), name.replace(/[-_]/g, "")]));

    icons.push({ name, svg, dataUri, keywords });
  }

  icons.sort((a, b) => a.name.localeCompare(b.name));
  return icons;
}
