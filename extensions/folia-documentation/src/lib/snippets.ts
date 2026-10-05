import {
  findMigration,
  SCHEDULER_APIS,
  SchedulerMigration,
} from "../data/scheduler";
import { entryUrl } from "./entry-url";
import { DocEntry, isType } from "./types";

const BUKKIT_SCHEDULER = "org.bukkit.scheduler.BukkitScheduler";

// entry.display for a member is "BukkitScheduler.runTaskTimer(Plugin, Runnable, long, long)",
// so the short method name is what is between the owning type's dot and the parameter list.
export function migrationFor(entry: DocEntry): SchedulerMigration | undefined {
  if (entry.owner !== BUKKIT_SCHEDULER) return undefined;
  const shortName = entry.display.split(".").pop()?.split("(")[0];
  return shortName ? findMigration(shortName) : undefined;
}

function topLevelType(entry: DocEntry): { pkg: string; simple: string } | null {
  const type = entry.owner || (isType(entry.kind) ? entry.name : "");
  if (!type) return null;

  const pkg = entry.pkg;
  const nested = type.slice(pkg.length + 1);
  return { pkg, simple: nested.split(".")[0] };
}

export function markdownLink(entry: DocEntry): string {
  const label = entry.kind === "guide" ? entry.display : entry.name;
  return `[${label}](${entryUrl(entry)})`;
}

export function importStatement(entry: DocEntry): string | null {
  const target = topLevelType(entry);
  return target ? `import ${target.pkg}.${target.simple};` : null;
}

// Folia's own repository patches Paper's build rather than storing plain
// .java sources, so there is no reliable file path to link straight to —
// a GitHub code search against the upstream Paper API is the honest fallback.
export function searchSourceUrl(entry: DocEntry): string | null {
  const target = topLevelType(entry);
  if (!target) return null;

  // Most of the Bukkit/Paper API is interfaces, not classes ("interface
  // Player", not "class Player"), so a literal "class X" search misses most
  // targets; matching the file name instead works regardless of kind.
  const query = encodeURIComponent(
    `repo:PaperMC/Paper path:paper-api filename:${target.simple}.java`,
  );
  return `https://github.com/search?q=${query}&type=code`;
}

function eventBoilerplate(entry: DocEntry): string | null {
  const simple = entry.display.replace(/Event$/, "");
  if (!simple) return null;
  const method = `on${simple}`;

  return [
    "public class MyListener implements Listener",
    "{",
    "    @EventHandler",
    `    public void ${method}(${entry.display} event)`,
    "    {",
    "        ",
    "    }",
    "}",
  ].join("\n");
}

function templates(): Map<string, string> {
  const scheduler = new Map(
    SCHEDULER_APIS.map((api) => [api.javadocName, api.code]),
  );

  return new Map<string, string>([
    ...scheduler,
    [
      "org.bukkit.plugin.java.JavaPlugin",
      [
        "public class MyPlugin extends JavaPlugin",
        "{",
        "    @Override",
        "    public void onEnable()",
        "    {",
        "        getServer().getPluginManager().registerEvents(new MyListener(), this);",
        "    }",
        "}",
      ].join("\n"),
    ],
    [
      "org.bukkit.plugin.PluginManager#registerEvents(org.bukkit.event.Listener,org.bukkit.plugin.Plugin)",
      "getServer().getPluginManager().registerEvents(new MyListener(), this);",
    ],
    [
      "org.bukkit.command.PluginCommand#setExecutor(org.bukkit.command.CommandExecutor)",
      'getCommand("mycommand").setExecutor(this);',
    ],
  ]);
}

export function boilerplate(entry: DocEntry): string | null {
  if (entry.kind === "event") return eventBoilerplate(entry);
  return templates().get(entry.name) ?? null;
}
