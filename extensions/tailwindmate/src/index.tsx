import { Action, ActionPanel, Icon, List, Toast, showToast, Clipboard } from "@raycast/api";
import chroma from "chroma-js";
import { palette } from "./tailwind-palette";

interface Args {
  hex: string;
}

interface Match {
  token: string;
  hex: string;
  deltaE: number;
}

export default function Command({ arguments: { hex } }: Readonly<{ arguments: Args }>) {
  const input = normalizeHex(hex ?? "");
  let matches: Match[] = [];

  if (hex && !input) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Hex Code",
      message: "Please enter a valid 3 or 6 digit hex color (e.g. #aabbcc or #abc).",
    });
  } else if (input) {
    try {
      matches = findMatches(input);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Color Processing Error",
        message: "Could not process the provided color. Please check your input.",
      });
    }
  }

  return (
    <List isShowingDetail searchBarPlaceholder="#aabbcc">
      {matches.map(({ token, hex: swatchHex, deltaE }) => (
        <List.Item
          key={token}
          title={token}
          subtitle={swatchHex}
          icon={{ source: Icon.CircleFilled, tintColor: swatchHex }}
          accessories={[{ text: `ΔE ${deltaE.toFixed(1)}` }]}
          detail={
            <List.Item.Detail
              markdown={`## ${token}\n\n![colour](https://singlecolorimage.com/get/${swatchHex.substring(
                1,
              )}/150x60)\n\n**Input**\n\`${input}\`\n\n**Closest Tailwind**\n\`${token}\``}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Tailwind Token"
                content={token}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Hex"
                content={swatchHex}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/* ---------- helpers ---------- */

function normalizeHex(value: string): string | null {
  const clean = value.trim().replace(/^#/, "");
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join("") : clean;
  return /^([0-9a-f]{6})$/i.test(full) ? `#${full}` : null;
}

function findMatches(inputHex: string, max = 5): Match[] {
  let l1: number, a1: number, b1: number;
  try {
    [l1, a1, b1] = chroma(inputHex).lab();
  } catch {
    throw new Error("Invalid color input");
  }

  const matches: Match[] = Object.entries(palette)
    .map(([token, hex]) => {
      let l2: number, a2: number, b2: number;
      try {
        [l2, a2, b2] = chroma(hex).lab();
      } catch {
        // Skip invalid palette colors
        return null;
      }
      const deltaE = Math.hypot(l1 - l2, a1 - a2, b1 - b2);
      return { token, hex, deltaE };
    })
    .filter(Boolean) as Match[];

  matches.sort((a, b) => a.deltaE - b.deltaE);
  const [best] = matches;

  if (best) {
    showToast({
      style: Toast.Style.Success,
      title: `Closest match copied to clipboard: ${best.token}`,
      message: best.hex,
    });
    Clipboard.copy(best.token);
  }

  return matches.slice(0, max);
}
