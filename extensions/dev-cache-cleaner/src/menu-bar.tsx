import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { CATEGORY_META } from "./types";
import type { ScanCategory, ScanResult } from "./types";
import { scanAll } from "./scanners";
import { formatBytes } from "./utils/disk";
import { getCachedResults, getCacheAge, setCachedResults } from "./utils/cache-store";

export default function CacheStatusMenuBar() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastScan, setLastScan] = useState("never");

  useEffect(() => {
    (async () => {
      // Try to load cached results first
      const cached = await getCachedResults();
      const age = await getCacheAge();

      if (cached && cached.length > 0) {
        // Cache exists — show it instantly, no rescan
        setResults(cached);
        setLastScan(age);
        setIsLoading(false);
        return;
      }

      // No cache — first run, must scan
      try {
        const fresh = await scanAll();
        setResults(fresh);
        await setCachedResults(fresh);
        setLastScan("just now");
      } catch {
        // Nothing to show
      }
      setIsLoading(false);
    })();
  }, []);

  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const safeSize = results.filter((r) => r.risk === "safe").reduce((sum, r) => sum + r.size, 0);

  const grouped = new Map<ScanCategory, ScanResult[]>();
  for (const r of results) {
    if (r.size < 10 * 1024 * 1024) continue;
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  const title = isLoading ? "..." : totalSize > 0 ? formatBytes(totalSize) : "0 B";

  return (
    <MenuBarExtra icon={Icon.HardDrive} title={title} isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Scan & Clean..."
          icon={Icon.MagnifyingGlass}
          onAction={() => open("raycast://extensions/Undolog/dev-cache-cleaner/scan-caches")}
        />
        <MenuBarExtra.Item
          title="Clean Safe Caches"
          icon={Icon.Trash}
          onAction={() => open("raycast://extensions/Undolog/dev-cache-cleaner/clean-safe-caches")}
        />
      </MenuBarExtra.Section>
      {results.length === 0 && !isLoading ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No caches found" icon={Icon.CheckCircle} />
        </MenuBarExtra.Section>
      ) : results.length > 0 ? (
        <>
          <MenuBarExtra.Section title={`Total: ${formatBytes(totalSize)} (${formatBytes(safeSize)} safe)`}>
            <MenuBarExtra.Item title={`Last scan: ${lastScan}`} icon={Icon.Clock} />
          </MenuBarExtra.Section>
          {Array.from(grouped.entries()).map(([category, items]) => {
            const catSize = items.reduce((sum, r) => sum + r.size, 0);
            return (
              <MenuBarExtra.Section key={category} title={`${CATEGORY_META[category].title} — ${formatBytes(catSize)}`}>
                {items.slice(0, 5).map((r) => (
                  <MenuBarExtra.Item key={r.id} title={r.title} subtitle={formatBytes(r.size)} icon={Icon.Circle} />
                ))}
                {items.length > 5 && (
                  <MenuBarExtra.Item title={`... and ${items.length - 5} more`} icon={Icon.Ellipsis} />
                )}
              </MenuBarExtra.Section>
            );
          })}
        </>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Scanning caches..." icon={Icon.Clock} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
