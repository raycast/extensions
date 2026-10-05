export interface SchedulerApi {
  name: string;
  javadocName: string;
  tagline: string;
  whenToUse: string;
  accessor: string;
  code: string;
}

// Every signature and accessor below is taken from the published Folia
// Javadoc (io.papermc.paper.threadedregions.scheduler.*, Bukkit and Entity),
// not invented, so the snippets compile against the real API.
export const SCHEDULER_APIS: SchedulerApi[] = [
  {
    name: "GlobalRegionScheduler",
    javadocName:
      "io.papermc.paper.threadedregions.scheduler.GlobalRegionScheduler",
    tagline:
      "Runs on the global region: server shutdown, world load/unload, command registration.",
    whenToUse:
      "Use this for logic that is not tied to any single location, such as reading server-wide state or reloading a config. It never touches per-world or per-entity state safely — use RegionScheduler or EntityScheduler for that.",
    accessor: "Bukkit.getGlobalRegionScheduler()",
    code: [
      "Bukkit.getGlobalRegionScheduler().run(plugin, task -> {",
      "    // runs once, on the global region",
      "});",
      "",
      "Bukkit.getGlobalRegionScheduler().runDelayed(plugin, task -> {",
      "    // runs once, after 20 ticks (1 second)",
      "}, 20L);",
      "",
      "Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, task -> {",
      "    // runs every 20 ticks, starting after 20 ticks",
      "}, 20L, 20L);",
    ].join("\n"),
  },
  {
    name: "RegionScheduler",
    javadocName: "io.papermc.paper.threadedregions.scheduler.RegionScheduler",
    tagline: "Runs on the region owning a given world coordinate or Location.",
    whenToUse:
      "Use this to touch blocks, chunks or the world state at a specific location — placing a block, spawning particles, checking a chunk — from code that is not already running on that region's thread (a scheduled task, a listener for a cross-region event, an async callback).",
    accessor: "Bukkit.getRegionScheduler()",
    code: [
      "Bukkit.getRegionScheduler().run(plugin, location, task -> {",
      "    location.getBlock().setType(Material.GLOWSTONE);",
      "});",
      "",
      "Bukkit.getRegionScheduler().runDelayed(plugin, location, task -> {",
      "    // runs once, after 20 ticks, on the region owning this location",
      "}, 20L);",
      "",
      "Bukkit.getRegionScheduler().runAtFixedRate(plugin, world, chunkX, chunkZ, task -> {",
      "    // runs every 20 ticks, on the region owning this chunk",
      "}, 20L, 20L);",
    ].join("\n"),
  },
  {
    name: "EntityScheduler",
    javadocName: "io.papermc.paper.threadedregions.scheduler.EntityScheduler",
    tagline:
      "Runs on whichever region currently owns a specific entity, and follows it across regions.",
    whenToUse:
      "Use this for any repeating or delayed logic tied to one entity — a boss fight timer, a follow-up message, a custom AI tick — instead of RegionScheduler, since the entity (and therefore its owning region) can move between calls. Every method takes a retired callback that runs if the entity is removed before the task fires.",
    accessor: "entity.getScheduler()",
    code: [
      "player.getScheduler().run(plugin, task -> {",
      '    player.sendMessage("Hello from the entity\'s own region!");',
      "}, null /* retired: runs instead, if the entity is gone */);",
      "",
      "player.getScheduler().runDelayed(plugin, task -> {",
      "    // runs once, after 20 ticks, wherever the player's region is by then",
      "}, null, 20L);",
      "",
      "player.getScheduler().runAtFixedRate(plugin, task -> {",
      "    // runs every 20 ticks, following the player between regions",
      "}, null, 20L, 20L);",
    ].join("\n"),
  },
  {
    name: "AsyncScheduler",
    javadocName: "io.papermc.paper.threadedregions.scheduler.AsyncScheduler",
    tagline: "Runs off the main tick loop entirely, on no particular region.",
    whenToUse:
      "Use this for anything that must not block a region's tick thread — HTTP requests, database queries, file I/O — the same use case as BukkitScheduler's old runTaskAsynchronously, but Folia-safe. Never touch world, entity or block state from here without hopping back onto GlobalRegionScheduler, RegionScheduler or EntityScheduler first.",
    accessor: "Bukkit.getAsyncScheduler()",
    code: [
      "Bukkit.getAsyncScheduler().runNow(plugin, task -> {",
      "    // runs immediately, off the main tick loop",
      "});",
      "",
      "Bukkit.getAsyncScheduler().runDelayed(plugin, task -> {",
      "    // runs once, after 1 second (note: real time, not ticks)",
      "}, 1L, TimeUnit.SECONDS);",
      "",
      "Bukkit.getAsyncScheduler().runAtFixedRate(plugin, task -> {",
      "    // runs every 30 seconds",
      "}, 1L, 30L, TimeUnit.SECONDS);",
    ].join("\n"),
  },
];

export const LEGACY_SCHEDULER_NOTICE =
  "`org.bukkit.scheduler.BukkitScheduler` is Paper's original single-threaded scheduler. On Folia most of its methods (`runTask`, `runTaskLater`, `runTaskTimer` and their async variants) throw `UnsupportedOperationException` — use GlobalRegionScheduler, RegionScheduler, EntityScheduler or AsyncScheduler instead.";

export interface SchedulerEquivalent {
  api: string;
  code: string;
}

export interface SchedulerMigration {
  /** The BukkitScheduler method this replaces, e.g. "runTaskTimer". */
  bukkitMethod: string;
  /**
   * True for the *Asynchronously variants: they never touched world/entity
   * state to begin with, so AsyncScheduler is the one correct replacement.
   * False for the sync variants, where BukkitScheduler's signature carries no
   * information about *what* the task touches, so all three region-aware
   * schedulers are shown — the right one depends on the task's own body.
   */
  deterministic: boolean;
  guidance: string;
  equivalents: SchedulerEquivalent[];
}

const RUNNABLE_BODY = "task -> {\n        // your code\n    }";

// Signatures taken from org.bukkit.scheduler.BukkitScheduler's own Javadoc,
// paired with the equivalent io.papermc.paper.threadedregions.scheduler.*
// call built from the signatures in SCHEDULER_APIS above.
export const BUKKIT_MIGRATIONS: SchedulerMigration[] = [
  {
    bukkitMethod: "runTask(Plugin, Runnable)",
    deterministic: false,
    guidance:
      "Runs once, next tick. Pick the scheduler that matches what the task itself touches — global state, a location, or an entity.",
    equivalents: [
      {
        api: "GlobalRegionScheduler",
        code: `Bukkit.getGlobalRegionScheduler().run(plugin, ${RUNNABLE_BODY});`,
      },
      {
        api: "RegionScheduler",
        code: `Bukkit.getRegionScheduler().run(plugin, location, ${RUNNABLE_BODY});`,
      },
      {
        api: "EntityScheduler",
        code: `entity.getScheduler().run(plugin, ${RUNNABLE_BODY}, null);`,
      },
    ],
  },
  {
    bukkitMethod: "runTaskLater(Plugin, Runnable, long)",
    deterministic: false,
    guidance:
      "Runs once after a delay in ticks. Pick the scheduler that matches what the task itself touches.",
    equivalents: [
      {
        api: "GlobalRegionScheduler",
        code: `Bukkit.getGlobalRegionScheduler().runDelayed(plugin, ${RUNNABLE_BODY}, delayTicks);`,
      },
      {
        api: "RegionScheduler",
        code: `Bukkit.getRegionScheduler().runDelayed(plugin, location, ${RUNNABLE_BODY}, delayTicks);`,
      },
      {
        api: "EntityScheduler",
        code: `entity.getScheduler().runDelayed(plugin, ${RUNNABLE_BODY}, null, delayTicks);`,
      },
    ],
  },
  {
    bukkitMethod: "runTaskTimer(Plugin, Runnable, long, long)",
    deterministic: false,
    guidance:
      "Runs repeatedly, in ticks. Pick the scheduler that matches what the task itself touches.",
    equivalents: [
      {
        api: "GlobalRegionScheduler",
        code: `Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, ${RUNNABLE_BODY}, delayTicks, periodTicks);`,
      },
      {
        api: "RegionScheduler",
        code: `Bukkit.getRegionScheduler().runAtFixedRate(plugin, location, ${RUNNABLE_BODY}, delayTicks, periodTicks);`,
      },
      {
        api: "EntityScheduler",
        code: `entity.getScheduler().runAtFixedRate(plugin, ${RUNNABLE_BODY}, null, delayTicks, periodTicks);`,
      },
    ],
  },
  {
    bukkitMethod: "runTaskAsynchronously(Plugin, Runnable)",
    deterministic: true,
    guidance:
      "Already off the main thread on Paper, so this maps to AsyncScheduler one-to-one.",
    equivalents: [
      {
        api: "AsyncScheduler",
        code: `Bukkit.getAsyncScheduler().runNow(plugin, ${RUNNABLE_BODY});`,
      },
    ],
  },
  {
    bukkitMethod: "runTaskLaterAsynchronously(Plugin, Runnable, long)",
    deterministic: true,
    guidance:
      "AsyncScheduler's delay is real time, not ticks, so a tick delay needs converting (20 ticks = 1 second).",
    equivalents: [
      {
        api: "AsyncScheduler",
        code: `Bukkit.getAsyncScheduler().runDelayed(plugin, ${RUNNABLE_BODY}, delayTicks * 50L, TimeUnit.MILLISECONDS);`,
      },
    ],
  },
  {
    bukkitMethod: "runTaskTimerAsynchronously(Plugin, Runnable, long, long)",
    deterministic: true,
    guidance:
      "AsyncScheduler's delay and period are real time, not ticks (20 ticks = 1 second).",
    equivalents: [
      {
        api: "AsyncScheduler",
        code: `Bukkit.getAsyncScheduler().runAtFixedRate(plugin, ${RUNNABLE_BODY}, delayTicks * 50L, periodTicks * 50L, TimeUnit.MILLISECONDS);`,
      },
    ],
  },
];

// BukkitScheduler's Javadoc entry keys members by their short display name
// ("BukkitScheduler.runTaskTimer"), so migrations are looked up the same way.
export function findMigration(
  shortName: string,
): SchedulerMigration | undefined {
  return BUKKIT_MIGRATIONS.find(
    (migration) => migration.bukkitMethod.split("(")[0] === shortName,
  );
}
