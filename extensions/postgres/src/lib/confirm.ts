import { LocalStorage } from "@raycast/api";
import { createHash } from "node:crypto";
import { getActiveConnection, resolveConnection, type Connection } from "./connections";

/** What a confirmation was about: the statement, and the connection argument that aimed it. */
export interface ConfirmedCall {
  connection?: string;
  sql: string;
}

const CONFIRMED_KEY = "postgres.confirmedTarget";

/** Everything the dialog promises about the target. If any of it moves, the promise is void. */
function fingerprint(connection: Connection): string {
  return [
    connection.id,
    connection.name,
    connection.host,
    String(connection.port),
    connection.user,
    connection.database,
    connection.ssl,
  ].join("\u0000");
}

/** Identifies the call a record belongs to, so an approval cannot be spent on a different one. */
function callKey(call: ConfirmedCall): string {
  return createHash("sha256")
    .update(`${call.connection ?? ""}\u0000${call.sql}`)
    .digest("hex");
}

function describe(connection: Connection): string {
  return `${connection.name} — ${connection.host}:${connection.port}/${connection.database}`;
}

/**
 * The info rows shown in a confirmation dialog before something is allowed to change data.
 *
 * Since tools accept a `connection` argument, the statement can be aimed at a database other than
 * the one the user picked in the UI — a model misreading "check staging" would otherwise write to
 * production behind a dialog that looks entirely routine. So the target is always spelled out, and
 * a target that is not the active connection gets its own row saying so.
 *
 * Also writes down what it showed, for {@link assertConfirmedTarget} to check against.
 */
export async function connectionInfoRows(call: ConfirmedCall): Promise<{ name: string; value: string }[]> {
  const [target, active] = await Promise.all([
    resolveConnection(call.connection).catch(() => undefined),
    getActiveConnection(),
  ]);

  const rows = [{ name: "Connection", value: target ? describe(target) : "could not be resolved" }];

  if (target && active && target.id !== active.id) {
    rows.push({
      name: "Not your active connection",
      value: `You have "${active.name}" active. This statement would run against "${target.name}" (${target.database}).`,
    });
  }

  if (target) {
    await LocalStorage.setItem(
      CONFIRMED_KEY,
      JSON.stringify({ key: callKey(call), fingerprint: fingerprint(target), shown: describe(target) }),
    ).catch(() => {});
  }

  return rows;
}

/**
 * Refuses to run when the target resolved now is not the one the dialog described.
 *
 * Confirming and running resolve the connection separately, and the approval can sit on screen for
 * as long as the user likes — long enough to switch the default connection or edit the profile in
 * Manage Connections, after which the statement lands on a host nobody approved. The dialog writes
 * down what it showed; this compares, then consumes the record so an approval is good once.
 *
 * A missing record means no confirmation ran, or the write failed — neither is evidence that the
 * target moved, so that case proceeds. This closes a target that changed under an approval; it is
 * not a second gate in front of one.
 */
export async function assertConfirmedTarget(call: ConfirmedCall, target: Connection): Promise<void> {
  const raw = await LocalStorage.getItem<string>(CONFIRMED_KEY);
  if (!raw) return;
  await LocalStorage.removeItem(CONFIRMED_KEY).catch(() => {});

  let record: { key?: string; fingerprint?: string; shown?: string };
  try {
    record = JSON.parse(raw);
  } catch {
    return;
  }

  // A record for some other call says nothing about this one.
  if (record.key !== callKey(call)) return;
  if (record.fingerprint === fingerprint(target)) return;

  throw new Error(
    `The connection changed after the user confirmed. They approved running this against ` +
      `"${record.shown}", but it would now run against "${describe(target)}". Nothing was run. ` +
      `Tell the user the target moved and call the tool again, so they can confirm the new one.`,
  );
}
