import * as p from "@clack/prompts";
import crypto from "crypto";
import {
  formatConnection,
  formatSshCommand,
  validateConnection,
} from "../lib/core.js";
import { getStatus, startTunnel, stopTunnel } from "../lib/process.js";
import {
  cloneConnection,
  loadConnections,
  removeConnection,
  saveConnection,
  type Connection,
} from "../lib/store.js";

async function connectionFormFlow(
  initial?: Connection,
  isClone = false,
): Promise<void> {
  const baseConn = initial && isClone ? cloneConnection(initial) : initial;

  const mode = await p.select({
    message: "Tunnel Mode",
    initialValue: baseConn?.mode ?? "forward",
    options: [
      { value: "forward", label: "Local Forwarding (-L)" },
      { value: "socks5", label: "SOCKS5 Proxy (-D)" },
    ],
  });
  if (p.isCancel(mode)) return;

  const sshTarget = await p.text({
    message: "SSH Target (e.g. user@host or SSH config alias)",
    initialValue: baseConn?.sshTarget ?? "",
    placeholder: "ubuntu@10.0.0.1",
    validate: (val) => {
      const str = val ?? "";
      if (!str.trim()) return "SSH target wajib diisi";
      if (/\s/.test(str) || str.startsWith("-"))
        return "SSH target harus berupa user@host atau alias tanpa spasi";
    },
  });
  if (p.isCancel(sshTarget)) return;

  const portStr = await p.text({
    message: "Port",
    initialValue: baseConn ? String(baseConn.port) : "",
    placeholder: "8080",
    validate: (val) => {
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 65535)
        return "Port harus berupa angka 1–65535";
    },
  });
  if (p.isCancel(portStr)) return;

  let remoteHost = "127.0.0.1";
  if (mode === "forward") {
    const rh = await p.text({
      message: "Remote Host",
      initialValue: baseConn?.remoteHost ?? "127.0.0.1",
      validate: (val) => {
        const str = val ?? "";
        if (!str.trim() || !/^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(str))
          return "Remote host harus berupa IP atau hostname sederhana";
      },
    });
    if (p.isCancel(rh)) return;
    remoteHost = rh as string;
  }

  const compression = await p.confirm({
    message: "Enable compression (-C)?",
    initialValue: baseConn?.compression ?? true,
  });
  if (p.isCancel(compression)) return;

  const connection: Connection = {
    id: baseConn?.id ?? crypto.randomUUID(),
    mode: mode as "forward" | "socks5",
    sshTarget: (sshTarget as string).trim(),
    port: Number(portStr),
    remoteHost: remoteHost.trim(),
    compression: Boolean(compression),
    lastUsedAt: Date.now(),
  };

  const errors = validateConnection(connection);
  if (errors.length > 0) {
    p.note(errors.join("\n"), "Validation Errors");
    return;
  }

  const s = p.spinner();
  s.start("Connecting tunnel...");
  try {
    if (initial && !isClone && getStatus(initial) === "running") {
      await stopTunnel(initial);
    }
    await startTunnel(connection);
    saveConnection(connection);
    s.stop("Tunnel started successfully! 🟢");
  } catch (err) {
    s.stop("Failed to start tunnel 🔴");
    p.note(err instanceof Error ? err.message : String(err), "Error");
  }
}

async function manageTunnelFlow(connection: Connection): Promise<void> {
  const status = getStatus(connection);
  const isRunning = status === "running";

  const action = await p.select({
    message: `Actions for ${formatConnection(connection)}:`,
    options: [
      {
        value: "toggle",
        label: isRunning ? "🔴 Disconnect Tunnel" : "🟢 Connect Tunnel",
      },
      { value: "copy", label: "📋 Copy SSH Command" },
      { value: "edit", label: "✏️ Edit and Connect" },
      { value: "clone", label: "📄 Clone and Connect" },
      { value: "delete", label: "🗑️ Delete Connection" },
    ],
  });
  if (p.isCancel(action)) return;

  if (action === "toggle") {
    const s = p.spinner();
    if (isRunning) {
      s.start("Disconnecting tunnel...");
      try {
        await stopTunnel(connection);
        s.stop("Tunnel disconnected ⚪");
      } catch (err) {
        s.stop("Failed to disconnect 🔴");
        p.note(err instanceof Error ? err.message : String(err), "Error");
      }
    } else {
      s.start("Connecting tunnel...");
      try {
        await startTunnel(connection);
        s.stop("Tunnel connected 🟢");
      } catch (err) {
        s.stop("Failed to connect 🔴");
        p.note(err instanceof Error ? err.message : String(err), "Error");
      }
    }
  } else if (action === "copy") {
    const cmd = formatSshCommand(connection);
    p.note(cmd, "SSH Command (Copy & run in terminal)");
  } else if (action === "edit") {
    await connectionFormFlow(connection, false);
  } else if (action === "clone") {
    await connectionFormFlow(connection, true);
  } else if (action === "delete") {
    if (isRunning) {
      await stopTunnel(connection);
    }
    removeConnection(connection.id);
    p.outro("Connection deleted.");
  }
}

async function main(): Promise<void> {
  p.intro("⚡ Quick SSH Tunnel CLI");

  const connections = loadConnections();
  const choices = connections.map((conn) => {
    const status = getStatus(conn) === "running" ? "🟢 RUNNING" : "⚪ STOPPED";
    return {
      value: conn.id,
      label: `${status}  ${formatConnection(conn)}`,
    };
  });

  const selectedId = await p.autocomplete({
    message: "Search tunnel or create new:",
    placeholder: "Type to filter target, port, or host...",
    options: [{ value: "new", label: "➕ Create New Tunnel" }, ...choices],
  });
  if (p.isCancel(selectedId)) {
    p.outro("Goodbye!");
    return;
  }

  if (selectedId === "new") {
    await connectionFormFlow();
  } else {
    const conn = connections.find((c) => c.id === selectedId);
    if (conn) {
      await manageTunnelFlow(conn);
    }
  }
}

main().catch((err) => {
  p.outro(
    `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
