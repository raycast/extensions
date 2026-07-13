import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  CacheEntry,
  cleanCaches,
  formatBytes,
  getCacheSize,
  prettyPath,
} from "../lib/cache";
import { confirmIfNeeded } from "../lib/confirm";
import { formatError } from "../lib/error";

type Props = {
  /** Heading shown on the Detail page. */
  title: string;
  /** Top-level English description of what this command does (markdown allowed). */
  description: string;
  /** Caches that will be deleted when the user confirms. */
  caches: CacheEntry[];
  /** Optional warning shown as a blockquote at the bottom. */
  warning?: string;
  /** Optional override for the action verb (default "Delete"). */
  actionVerb?: string;
};

export default function CleanInfo({
  title,
  description,
  caches,
  warning,
  actionVerb = "Delete",
}: Props) {
  const [sizes, setSizes] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadSizes() {
    setSizes(null);
    const result = await Promise.all(caches.map(getCacheSize));
    setSizes(result);
  }

  useEffect(() => {
    loadSizes();
  }, []);

  const total = sizes?.reduce((a, b) => a + b, 0) ?? 0;
  const isEmpty = sizes !== null && total === 0;

  const sizeLines = caches
    .map((c, i) => {
      const size = sizes ? formatBytes(sizes[i]) : "_calculating…_";
      return `- **${c.name}**: ${size}`;
    })
    .join("\n");

  const pathLines = caches
    .flatMap((c) => c.paths)
    .map((p) => `- \`${prettyPath(p)}\``)
    .join("\n");

  const md = [
    `# ${title}`,
    "",
    description,
    "",
    "## Will be deleted",
    "",
    pathLines,
    "",
    "## Current size",
    "",
    sizeLines,
    sizes !== null
      ? `\n**Total: ${formatBytes(total)}**${isEmpty ? " (already empty)" : ""}`
      : "",
    warning ? `\n> ⚠️ ${warning}` : "",
  ].join("\n");

  async function clean() {
    if (isEmpty) {
      await showToast({
        style: Toast.Style.Success,
        title: "Already empty",
      });
      await popToRoot();
      return;
    }
    const ok = await confirmIfNeeded(`Delete ${formatBytes(total)}?`, title);
    if (!ok) return;
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${title}…`,
    });
    try {
      await cleanCaches(caches);
      toast.style = Toast.Style.Success;
      toast.title = `Cleaned ${formatBytes(total)}`;
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = formatError(e);
      setBusy(false);
    }
  }

  const actionTitle =
    sizes === null
      ? "Calculating…"
      : isEmpty
        ? "Already Empty"
        : `${actionVerb} ${formatBytes(total)}`;

  return (
    <Detail
      isLoading={sizes === null || busy}
      navigationTitle={title}
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title={actionTitle}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={clean}
          />
          <Action
            title="Refresh Sizes"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadSizes}
          />
        </ActionPanel>
      }
    />
  );
}
