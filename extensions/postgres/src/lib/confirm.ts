import { getActiveConnection, resolveConnection } from "./connections";

/**
 * The info rows shown in a confirmation dialog before something is allowed to change data.
 *
 * Since tools accept a `connection` argument, the statement can be aimed at a database other than
 * the one the user picked in the UI — a model misreading "check staging" would otherwise write to
 * production behind a dialog that looks entirely routine. So the target is always spelled out, and
 * a target that is not the active connection gets its own row saying so.
 */
export async function connectionInfoRows(name?: string): Promise<{ name: string; value: string }[]> {
  const [target, active] = await Promise.all([resolveConnection(name).catch(() => undefined), getActiveConnection()]);

  const rows = [
    {
      name: "Connection",
      value: target ? `${target.name} — ${target.host}:${target.port}/${target.database}` : "could not be resolved",
    },
  ];

  if (target && active && target.id !== active.id) {
    rows.push({
      name: "Not your active connection",
      value: `You have "${active.name}" active. This statement would run against "${target.name}" (${target.database}).`,
    });
  }

  return rows;
}
