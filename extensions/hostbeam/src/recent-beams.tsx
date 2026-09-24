import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  environment,
  open,
  showHUD,
  Keyboard,
} from "@raycast/api";

import {
  BUNDLE_ID,
  fileName,
  groupRecent,
  readConfig,
  sentenceFor,
  type HostbeamConfig,
  type RecentBeam,
} from "./hostbeam";

/** The file a row's thumbnail can be shown from.
 *
 *  Since Hostbeam 0.1.27 a thumbnail is a file in the app's cache and the row
 *  holds its path, shown as it is — or not at all once the app has pruned it.
 *  Older rows hold a data URL, which a list icon cannot take, so each of those
 *  is written once into the extension's own support directory and shown from
 *  there. Named after the row id, so it is written once per beam. */
function thumbnailPath(row: RecentBeam): string | undefined {
  const thumb = row.thumb ?? "";
  if (thumb.startsWith("/")) return existsSync(thumb) ? thumb : undefined;
  const match = /^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/s.exec(
    thumb,
  );
  if (!match) return undefined;
  const [, format, base64] = match;
  const dir = join(environment.supportPath, "thumbs");
  const file = join(dir, `${row.id}.${format === "jpeg" ? "jpg" : format}`);
  try {
    if (!existsSync(file)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, Buffer.from(base64, "base64"));
    }
    return file;
  } catch {
    return undefined;
  }
}

function when(at: number): string {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Row({
  rows,
  config,
}: {
  rows: RecentBeam[];
  config: HostbeamConfig | null;
}) {
  const first = rows[0];
  const paths = rows.map((r) => r.path);
  const thumb = thumbnailPath(first);
  const title =
    rows.length > 1
      ? `${fileName(first.path)} ×${rows.length}`
      : fileName(first.path);
  return (
    <List.Item
      icon={thumb ? { source: thumb } : Icon.Image}
      title={title}
      subtitle={first.hostName ?? first.hostId}
      accessories={[{ text: when(first.at) }]}
      actions={
        <ActionPanel>
          <Action
            title={
              rows.length > 1
                ? "Copy Paste-Ready Text (All)"
                : "Copy Paste-Ready Text"
            }
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(sentenceFor(config, paths));
              await showHUD("Copied");
            }}
          />
          <Action.CopyToClipboard
            title="Copy Remote Path"
            content={paths.join("\n")}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Open Hostbeam"
            icon={Icon.AppWindow}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open("", BUNDLE_ID)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const config = readConfig();
  const groups = groupRecent(config?.recent ?? []);
  return (
    <List searchBarPlaceholder="Search what you have beamed">
      {groups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Image}
          title="Nothing beamed yet"
          description={
            config
              ? "Beams show up here once you send one."
              : "Hostbeam has not run on this Mac."
          }
        />
      ) : (
        groups.map((rows) => (
          <Row key={rows[0].id} rows={rows} config={config} />
        ))
      )}
    </List>
  );
}
