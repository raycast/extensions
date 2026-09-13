import type { Connection } from "./store";

const HOST_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;

export function buildArgs(connection: Connection): string[] {
  const args = ["-N", connection.mode === "socks5" ? "-D" : "-L"];
  args.push(
    connection.mode === "socks5"
      ? String(connection.port)
      : `${connection.port}:${connection.remoteHost}:${connection.port}`,
  );
  if (connection.compression) args.push("-C");
  args.push(
    "-o",
    "BatchMode=yes",
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3",
    connection.sshTarget,
  );
  return args;
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:@=-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`;
}

export function formatSshCommand(connection: Connection): string {
  return ["ssh", ...buildArgs(connection)].map(shellQuote).join(" ");
}

export function connectionKey(connection: Connection): string {
  return JSON.stringify([
    connection.mode,
    connection.sshTarget,
    connection.port,
    connection.remoteHost,
    connection.compression,
  ]);
}

export function validateConnection(
  connection: Pick<Connection, "mode" | "sshTarget" | "port" | "remoteHost">,
): string[] {
  const errors: string[] = [];
  if (!connection.sshTarget.trim()) {
    errors.push("SSH target wajib diisi");
  } else if (
    /\s/.test(connection.sshTarget) ||
    connection.sshTarget.startsWith("-")
  ) {
    errors.push("SSH target harus berupa user@host atau alias tanpa spasi");
  }
  if (
    !Number.isInteger(connection.port) ||
    connection.port < 1 ||
    connection.port > 65535
  ) {
    errors.push("Port harus berupa angka 1–65535");
  }
  if (
    connection.mode !== "socks5" &&
    (!connection.remoteHost.trim() || !HOST_PATTERN.test(connection.remoteHost))
  ) {
    errors.push("Remote host harus berupa IP atau hostname sederhana");
  }
  return errors;
}

export function formatConnection(
  connection: Pick<Connection, "mode" | "sshTarget" | "port" | "remoteHost">,
): string {
  return connection.mode === "socks5"
    ? `${connection.sshTarget} · SOCKS5 · ${connection.port}`
    : `${connection.sshTarget} · ${connection.port} → ${connection.remoteHost}`;
}
