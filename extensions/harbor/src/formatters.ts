import os from "os";
import { Color, Icon, Image } from "@raycast/api";
import { Connection, Process } from "./procs";

const LABEL_MAX_CHARS = 35;

export const formatConnection = (connection: Connection): string => {
  let local, remote;
  if (connection.localAddress != null) {
    local = `${connection.localAddress}:${connection.localPort}`;
  }
  if (connection.remoteAddress != null) {
    remote = `${connection.remoteAddress}:${connection.remotePort}`;
  }
  if (local && remote) {
    return `${local} → ${remote}`;
  }

  return remote ?? local ?? "";
};

export const formatTitle = (procs: Process[], ignoreProcsByArgs: string[]): string => {
  const nodeProcs = procs.filter((p) => shouldHideProc(p, ignoreProcsByArgs));
  return nodeProcs
    .map((p) => p.connections)
    .flat()
    .filter((conn) => conn.remoteAddress == null && conn.remotePort == null)
    .map((conn) => conn.localPort)
    .filter((port) => port !== "443" && port !== "80")
    .join(" · ")
    .trim();
};

export const getCmdDisplayInfo = (proc: Process): { label: string; icon?: Image } => {
  let formattedPorts: string | undefined = undefined;

  const args = proc.args ?? "";
  if (proc.connections.length > 0) {
    const ports = new Set(
      proc.connections
        .filter(onlyLocalPorts)
        .map((conn) => conn.localPort)
        .filter(Boolean)
    );
    formattedPorts = [...ports.values()][0];
    if (ports.size > 1) {
      formattedPorts += ` (${ports.size - 1} more)`;
    }
  }

  const icon = proc.cmd === "node" ? { source: "node-js-32.png", tintColor: Color.Green } : getIconForCmdArgs(args);

  const formattedArgs = truncate(normalizePath(args));

  const label = [formattedPorts, formattedArgs].filter(Boolean).join(" · ") ?? proc.cmd;
  return {
    label,
    icon: icon,
  };
};

const getIconForCmdArgs = (args: string): Image | undefined => {
  let icon: Icon = Icon.CloudLightning;

  const systemPrefix = "/System";
  const systemAppsPrefix = "/System/Applications";
  const appsPrefix = "/Applications/";

  if (args.startsWith(systemPrefix)) {
    icon = Icon.Gear;
    args = args.slice(systemPrefix.length);
  } else if (args.startsWith(systemAppsPrefix)) {
    icon = Icon.Gear;
    args = args.slice(systemAppsPrefix.length);
  } else if (args.startsWith(appsPrefix)) {
    icon = Icon.AppWindow;
    args = args.slice(appsPrefix.length);
  }
  return { source: icon, tintColor: Color.Green };
};

export const truncate = (label: string) => {
  const trimmed = label.trim();
  if (trimmed.length <= LABEL_MAX_CHARS) {
    return trimmed;
  }

  const numHiddenEdgeChars = (trimmed.length - LABEL_MAX_CHARS - 1) / 2;
  if (numHiddenEdgeChars <= 0) {
    return trimmed;
  }

  const start = trimmed.length / 2;
  return trimmed.slice(0, start - numHiddenEdgeChars) + "..." + trimmed.slice(start + numHiddenEdgeChars);
};

export const normalizePath = (path: string) => {
  const homedir = os.homedir();
  return path.startsWith(homedir) ? path.replace(homedir, "~") : path;
};

export const shouldHideProc = (proc: Process, ignoreProcsByArgs: string[]): boolean => {
  return proc.cmd === "node" && proc.args != null && !ignoreProcsByArgs.includes(proc.args.trim());
};

export const onlyLocalPorts = (connection: Connection): boolean => {
  return connection.localAddress === "127.0.0.1";
};
