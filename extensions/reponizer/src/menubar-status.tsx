import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useMemo, useState } from "react";
import { readCachedIndex, rebuildIndex } from "./lib/cache";
import { getConfig } from "./lib/config";
import { attentionReasons } from "./lib/filters";
import { relativeTime } from "./lib/util";

const MAX_ITEMS = 12;

export default function Command() {
  const config = getConfig();
  const [index, setIndex] = useState(() => readCachedIndex(config.root));
  const [isLoading, setIsLoading] = useState(false);

  const problems = useMemo(() => {
    if (!index) return [];
    return index.entries
      .map((entry) => ({ entry, reasons: attentionReasons(entry) }))
      .filter(({ reasons }) => reasons.length > 0);
  }, [index]);

  const rescan = async () => {
    setIsLoading(true);
    try {
      setIndex(await rebuildIndex(config.root, config.maxDepth, config.defaultProtocol, { reuseSizesFrom: index }));
    } finally {
      setIsLoading(false);
    }
  };

  const icon =
    problems.length > 0
      ? { source: Icon.Folder, tintColor: Color.Orange }
      : { source: Icon.Folder, tintColor: Color.PrimaryText };

  return (
    <MenuBarExtra
      icon={icon}
      title={problems.length > 0 ? String(problems.length) : undefined}
      tooltip="Reponizer — repository health"
      isLoading={isLoading}
    >
      {!index && <MenuBarExtra.Item title="No scan yet — open Reponizer once" icon={Icon.Info} />}
      {index && problems.length === 0 && <MenuBarExtra.Item title="All repositories healthy" icon={Icon.CheckCircle} />}
      {problems.length > 0 && (
        <MenuBarExtra.Section title="Needs Attention">
          {problems.slice(0, MAX_ITEMS).map(({ entry, reasons }) => (
            <MenuBarExtra.Item
              key={entry.relativePath}
              title={entry.relativePath}
              subtitle={reasons[0]}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              onAction={() => open(entry.fullPath, config.editorApp)}
            />
          ))}
          {problems.length > MAX_ITEMS && <MenuBarExtra.Item title={`… and ${problems.length - MAX_ITEMS} more`} />}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Reponizer"
          icon={Icon.MagnifyingGlass}
          onAction={() => launchCommand({ name: "search-repos", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Rescan Now" icon={Icon.ArrowClockwise} onAction={rescan} />
        {index && <MenuBarExtra.Item title={`Last scan: ${relativeTime(index.scannedAt)}`} icon={Icon.Clock} />}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
