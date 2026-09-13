import { useState } from "react";
import { Action, ActionPanel, Clipboard, Grid, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Emote, MAX_PAGE, PER_PAGE, SIZES, pick, search } from "./pick.ts";

// Raycast renders gif and png but not webp, so preview with the very file we would paste —
// which also means animated emotes animate in the grid.
const preview = (e: Emote) => {
  try {
    return pick(e, "2x").url;
  } catch {
    return Icon.QuestionMark;
  }
};

async function deliver(e: Emote, size: string, paste: boolean) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Fetching ${e.name}…` });
  try {
    const hit = pick(e, size);
    toast.title = `Fetching ${hit.ext.toUpperCase()} ${hit.size}…`;
    const r = await fetch(hit.url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const dir = join(tmpdir(), "snag");
    await mkdir(dir, { recursive: true });
    // Emote names are user-submitted and land in a path — keep them to safe characters.
    const file = join(dir, `${e.name.replace(/[^\w.-]+/g, "_") || e.id}.${hit.ext}`);
    await writeFile(file, Buffer.from(await r.arrayBuffer()));
    await (paste ? Clipboard.paste({ file }) : Clipboard.copy({ file }));
    await showHUD(`${paste ? "Pasted" : "Copied"} ${e.name} · ${hit.ext.toUpperCase()} ${hit.size} ✓`);
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = paste ? "Paste failed" : "Copy failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [size, setSize] = useState("2x");
  const [count, setCount] = useState(0);

  const { isLoading, data, pagination } = usePromise(
    (q: string) =>
      async ({ page }: { page: number }) => {
        const { count, items } = await search(q, page + 1);
        setCount(count);
        return { data: items, hasMore: items.length === PER_PAGE && page + 2 <= MAX_PAGE };
      },
    [query],
  );

  const shown = data?.length ?? 0;

  return (
    <Grid
      columns={8}
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarPlaceholder="Search emotes…"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Size" storeValue defaultValue="2x" onChange={setSize}>
          {SIZES.map((s) => (
            <Grid.Dropdown.Item key={s} title={s} value={s} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.Section
        title={query || "Trending"}
        subtitle={count ? `${shown.toLocaleString()} of ${count.toLocaleString()}` : undefined}
      >
        {(data ?? []).map((e) => (
          <Grid.Item
            key={e.id}
            content={preview(e)}
            title={e.name}
            subtitle={e.animated ? "GIF" : "PNG"}
            actions={
              <ActionPanel>
                <Action title="Paste Emote" icon={Icon.Clipboard} onAction={() => deliver(e, size, true)} />
                <Action title="Copy Emote" icon={Icon.CopyClipboard} onAction={() => deliver(e, size, false)} />
                <Action.OpenInBrowser url={`https://7tv.app/emotes/${e.id}`} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
