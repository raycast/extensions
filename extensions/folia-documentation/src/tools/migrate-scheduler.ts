import {
  BUKKIT_MIGRATIONS,
  findMigration,
  LEGACY_SCHEDULER_NOTICE,
} from "../data/scheduler";

type Input = {
  /**
   * The BukkitScheduler method being migrated away from, e.g. "runTaskTimer"
   * or "runTaskLaterAsynchronously". A full call such as
   * "Bukkit.getScheduler().runTask(plugin, task)" also works.
   */
  method: string;
};

const KNOWN_METHODS = BUKKIT_MIGRATIONS.map(
  (migration) => migration.bukkitMethod.split("(")[0],
);

export default function migrateScheduler(input: Input) {
  const mentioned = input.method.match(/[a-zA-Z]+/g) ?? [];
  const methodName = KNOWN_METHODS.find((name) =>
    mentioned.some((word) => word.toLowerCase() === name.toLowerCase()),
  );
  const migration = methodName ? findMigration(methodName) : undefined;

  if (!migration) {
    return {
      found: false,
      message: `"${input.method}" does not match a known BukkitScheduler method. Known methods: ${KNOWN_METHODS.join(", ")}.`,
      legacySchedulerNotice: LEGACY_SCHEDULER_NOTICE,
    };
  }

  return {
    found: true,
    bukkitMethod: migration.bukkitMethod,
    deterministic: migration.deterministic,
    guidance: migration.guidance,
    equivalents: migration.equivalents,
    note: migration.deterministic
      ? "This is a one-to-one replacement: BukkitScheduler's async methods never touched world or entity state, so AsyncScheduler is always correct here."
      : "BukkitScheduler's signature carries no information about what the task actually touches, so more than one equivalent is listed. Pick GlobalRegionScheduler if the task touches nothing location- or entity-specific, RegionScheduler if it touches a Location/Block/World, or EntityScheduler if it is tied to one specific entity. Do not default to GlobalRegionScheduler for everything — that only tends to work when the server has a single region.",
  };
}
