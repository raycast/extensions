import { ActionPanel, Action, List, showToast, Toast, LocalStorage, Color } from "@raycast/api";
import { useState, useEffect } from "react";

// GitLab's icon set (@gitlab/svgs) is previewed at https://design.gitlab.com/svgs/.
// The full icon set ships as a single SVG sprite sheet of <symbol> elements.
const SPRITE_URL = "https://unpkg.com/@gitlab/svgs/dist/icons.svg";
const PREVIEW_BASE_URL = "https://design.gitlab.com/svgs/";

const CACHE_KEY = "GitLabSvgs.sprite";

export default function Command() {
  const { icons, isLoading } = useIcons();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search GitLab icons..." throttle>
      <List.Section title="Icons" subtitle={icons.length + ""}>
        {icons.map((icon) => (
          <List.Item
            key={icon.name}
            icon={{ source: icon.dataUri, tintColor: Color.PrimaryText }}
            title={icon.name}
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
      </List.Section>
    </List>
  );
}

interface Icon {
  name: string;
  svg: string;
  dataUri: string;
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
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 16 16";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="#000000">${inner}</svg>`;
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

    icons.push({ name, svg, dataUri });
  }

  icons.sort((a, b) => a.name.localeCompare(b.name));
  return icons;
}
