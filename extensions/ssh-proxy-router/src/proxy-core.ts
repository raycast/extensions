import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as nativeFs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import net from "node:net";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";

const execFileAsync = promisify(execFile);

const NETWORKSETUP = "/usr/sbin/networksetup";
const LAUNCHCTL = "/bin/launchctl";
const PYTHON = "/usr/bin/python3";
const SSH = "/usr/bin/ssh";
const CURL = "/usr/bin/curl";

const PAC_LAUNCHD_LABEL = "com.raycast.ssh-proxy-router.pac";
const SSH_LAUNCHD_LABEL = "com.raycast.ssh-proxy-router.ssh";
const LAUNCHD_THROTTLE_SECONDS = 60;
const SSH_SERVER_ALIVE_INTERVAL_SECONDS = 60;

export type Preferences = {
  sshUser: string;
  sshHost: string;
  sshPort: string;
  identityFile?: string;
  routedHosts: string;
  primaryURL?: string;
  socksPort: string;
  pacPort: string;
  startTimeout: string;
  networkServices?: string;
  openInSafari: boolean;
};

export type Config = {
  sshUser: string;
  sshHost: string;
  sshPort: number;
  identityFile?: string;
  routedHosts: RouteRule[];
  primaryURL: string;
  socksPort: number;
  pacPort: number;
  startTimeoutMs: number;
  networkServices?: string[];
  openInSafari: boolean;
};

type SavedProxySetting = {
  service: string;
  url: string | null;
  enabled: boolean;
};

export type RouteRule = {
  host: string;
  wildcard: boolean;
};

type LaunchdJobInfo = {
  loaded: boolean;
  state?: string;
  runs?: number;
  lastExitCode?: number;
};

export type RoutedWebsite = {
  title: string;
  url: string;
};

export type ProxyStatus = {
  running: boolean;
  degraded: boolean;
  detail: string;
  tunnel: boolean;
  pacServer: boolean;
  routing: boolean;
};

function parseInteger(name: string, value: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function expandHome(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return path.join(homedir(), value.slice(2));
  return value;
}

function normalizeHost(value: string): string {
  const candidate = value.trim();
  if (!candidate) throw new Error("Routed Websites cannot contain an empty entry.");
  try {
    const parsed = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (!host || host.includes("*")) throw new Error();
    return host;
  } catch {
    throw new Error(`Invalid routed website: ${value}`);
  }
}

function parseRouteRules(value: string): RouteRule[] {
  const entries = value
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) throw new Error("Add at least one host under Routed Websites.");

  const rules = entries.map((entry) => {
    const wildcard = entry.startsWith("*.");
    const host = normalizeHost(wildcard ? entry.slice(2) : entry);
    return { host, wildcard };
  });
  return rules.filter(
    (rule, index) =>
      rules.findIndex((candidate) => candidate.host === rule.host && candidate.wildcard === rule.wildcard) === index,
  );
}

function primaryURL(value: string | undefined, rules: RouteRule[]): string {
  const candidate = value?.trim() || `https://${rules[0].host}`;
  try {
    const parsed = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("Primary Website URL must be a valid HTTP or HTTPS URL.");
  }
}

export function parsePreferences(preferences: Preferences): Config {
  const routeRules = parseRouteRules(preferences.routedHosts);
  const services = preferences.networkServices
    ?.split(",")
    .map((service) => service.trim())
    .filter(Boolean);

  return {
    sshUser: preferences.sshUser.trim(),
    sshHost: preferences.sshHost.trim(),
    sshPort: parseInteger("SSH Port", preferences.sshPort, 1, 65535),
    identityFile: preferences.identityFile?.trim() ? expandHome(preferences.identityFile.trim()) : undefined,
    routedHosts: routeRules,
    primaryURL: primaryURL(preferences.primaryURL, routeRules),
    socksPort: parseInteger("Local SOCKS Port", preferences.socksPort, 1024, 65535),
    pacPort: parseInteger("Local PAC Port", preferences.pacPort, 1024, 65535),
    startTimeoutMs: parseInteger("Start Timeout", preferences.startTimeout, 1, 120) * 1000,
    networkServices: services?.length ? services : undefined,
    openInSafari: preferences.openInSafari,
  };
}

function errorMessage(error: unknown): string {
  const detail = error as Error & { stdout?: string; stderr?: string };
  return (detail?.stderr || detail?.stdout || detail?.message || String(error)).trim();
}

export type RoutingConfig = Pick<Config, "routedHosts" | "primaryURL" | "socksPort" | "pacPort" | "networkServices">;
export type DiagnosticConfig = RoutingConfig & { schemaVersion: 1; networkServices: string[] };
export type DiagnosticCheck = { name: string; status: "pass" | "fail" | "skipped"; detail: string };
export type DiagnosticReport = { passed: boolean; checks: DiagnosticCheck[] };
export type ProxyDependencies = {
  home: string;
  uid: number;
  fs: typeof nativeFs;
  execute: typeof systemExecute;
  isPortOpen: typeof systemIsPortOpen;
  waitUntil: typeof systemWaitUntil;
};

async function systemExecute(file: string, args: string[], timeout = 15_000): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      encoding: "utf8",
      timeout,
      maxBuffer: 1024 * 1024,
    });
    return (stdout || stderr).trim();
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

async function systemIsPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1_500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function systemWaitUntil(check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return check();
}

export function pacURL(config: RoutingConfig): string {
  const version = createHash("sha256")
    .update(JSON.stringify({ socksPort: config.socksPort, routedHosts: config.routedHosts }))
    .digest("hex")
    .slice(0, 12);
  return `http://127.0.0.1:${config.pacPort}/proxy.pac?v=${version}`;
}

export function buildPac(config: RoutingConfig): string {
  const conditions = config.routedHosts.map((rule) =>
    rule.wildcard
      ? `(host === ${JSON.stringify(rule.host)} || dnsDomainIs(host, ${JSON.stringify(`.${rule.host}`)}))`
      : `host === ${JSON.stringify(rule.host)}`,
  );
  return [
    "function FindProxyForURL(url, host) {",
    "  host = host.toLowerCase();",
    `  if (${conditions.join(" ||\n      ")}) {`,
    `    return "SOCKS 127.0.0.1:${config.socksPort}";`,
    "  }",
    '  return "DIRECT";',
    "}",
    "",
  ].join("\n");
}

export function createProxyController(config: Config | RoutingConfig, overrides: Partial<ProxyDependencies> = {}) {
  const home = overrides.home ?? homedir();
  const uid = overrides.uid ?? process.getuid?.() ?? 0;
  const fs = overrides.fs ?? nativeFs;
  const execute = overrides.execute ?? systemExecute;
  const isPortOpen = overrides.isPortOpen ?? systemIsPortOpen;
  const waitUntil = overrides.waitUntil ?? systemWaitUntil;
  const STATE_DIR = path.join(home, ".local", "state", "raycast-ssh-proxy-router");
  const PAC_FILE = path.join(STATE_DIR, "proxy.pac");
  const PAC_SERVER_FILE = path.join(STATE_DIR, "pac-server.py");
  const PAC_LOG_FILE = path.join(STATE_DIR, "pac-server.log");
  const SSH_LOG_FILE = path.join(STATE_DIR, "ssh-tunnel.log");
  const PROXY_BACKUP_FILE = path.join(STATE_DIR, "automatic-proxy-backup.json");
  const PAC_LAUNCH_AGENT_FILE = path.join(home, "Library", "LaunchAgents", `${PAC_LAUNCHD_LABEL}.plist`);
  const SSH_LAUNCH_AGENT_FILE = path.join(home, "Library", "LaunchAgents", `${SSH_LAUNCHD_LABEL}.plist`);
  async function succeeds(file: string, args: string[], timeout = 5_000): Promise<boolean> {
    try {
      await execute(file, args, timeout);
      return true;
    } catch {
      return false;
    }
  }

  function launchdTarget(label: string): string {
    return `gui/${uid}/${label}`;
  }

  async function launchdJobInfo(label: string): Promise<LaunchdJobInfo> {
    let output: string;
    try {
      output = await execute(LAUNCHCTL, ["print", launchdTarget(label)]);
    } catch {
      return { loaded: false };
    }

    const parseNumber = (pattern: RegExp): number | undefined => {
      const match = output.match(pattern)?.[1];
      if (match === undefined) return undefined;
      const parsed = Number(match);
      return Number.isInteger(parsed) ? parsed : undefined;
    };

    return {
      loaded: true,
      state: output.match(/^\s*state = (.+)$/m)?.[1]?.trim(),
      runs: parseNumber(/^\s*runs = (-?\d+)$/m),
      lastExitCode: parseNumber(/^\s*last exit code = (-?\d+)$/m),
    };
  }

  function xmlEscape(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      const detail = error as NodeJS.ErrnoException;
      if (detail.code === "ENOENT") return false;
      throw error;
    }
  }

  async function tunnelRunning(config: RoutingConfig): Promise<boolean> {
    return (await launchdJobInfo(SSH_LAUNCHD_LABEL)).loaded && (await isPortOpen(config.socksPort));
  }

  async function pacServerRunning(config: RoutingConfig): Promise<boolean> {
    return (await launchdJobInfo(PAC_LAUNCHD_LABEL)).loaded && (await isPortOpen(config.pacPort));
  }

  async function listNetworkServices(config: RoutingConfig): Promise<string[]> {
    if (config.networkServices) return config.networkServices;
    const output = await execute(NETWORKSETUP, ["-listallnetworkservices"]);
    return output
      .split("\n")
      .slice(1)
      .map((service) => service.trimEnd())
      .filter((service) => service.length > 0 && !service.startsWith("*"));
  }

  async function getAutomaticProxy(service: string): Promise<SavedProxySetting> {
    const output = await execute(NETWORKSETUP, ["-getautoproxyurl", service]);
    const url = output.match(/^URL: (.*)$/m)?.[1] ?? "(null)";
    const enabled = output.match(/^Enabled: (.*)$/m)?.[1] === "Yes";
    return { service, url: url === "(null)" ? null : url, enabled };
  }

  async function routingConfigured(config: RoutingConfig): Promise<boolean> {
    const services = await listNetworkServices(config);
    if (services.length === 0) return false;
    const settings = await Promise.all(services.map(getAutomaticProxy));
    const expectedURL = pacURL(config);
    return settings.every((setting) => setting.enabled && setting.url === expectedURL);
  }

  async function saveProxySettings(config: RoutingConfig): Promise<void> {
    try {
      await fs.access(PROXY_BACKUP_FILE);
      return;
    } catch {
      // No existing backup; capture the current settings below.
    }

    const services = await listNetworkServices(config);
    if (services.length === 0) throw new Error("No enabled macOS network services were found.");
    const settings = await Promise.all(services.map(getAutomaticProxy));
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(PROXY_BACKUP_FILE, `${JSON.stringify(settings, null, 2)}\n`, { flag: "wx" });
  }

  async function restoreProxySettings(config: RoutingConfig): Promise<void> {
    let settings: SavedProxySetting[];
    try {
      settings = JSON.parse(await fs.readFile(PROXY_BACKUP_FILE, "utf8")) as SavedProxySetting[];
    } catch (error) {
      const detail = error as NodeJS.ErrnoException;
      if (detail.code !== "ENOENT") throw new Error(`Could not read saved proxy settings: ${errorMessage(error)}`);

      // Recovery path for a crash before the backup was written: only disable
      // services that still point at this extension's localhost PAC endpoint.
      const services = await listNetworkServices(config);
      const current = await Promise.all(services.map(getAutomaticProxy));
      settings = current
        .filter((setting) => setting.url?.startsWith(`http://127.0.0.1:${config.pacPort}/proxy.pac`))
        .map((setting) => ({ ...setting, enabled: false }));
    }

    const errors: string[] = [];
    for (const setting of settings) {
      try {
        if (setting.url) {
          await execute(NETWORKSETUP, ["-setautoproxyurl", setting.service, setting.url]);
        }
        await execute(NETWORKSETUP, ["-setautoproxystate", setting.service, setting.enabled ? "on" : "off"]);
      } catch (error) {
        errors.push(`${setting.service}: ${errorMessage(error)}`);
      }
    }
    if (errors.length) throw new Error(`Could not restore proxy settings: ${errors.join("; ")}`);
    await fs.rm(PROXY_BACKUP_FILE, { force: true });
  }

  async function enableRouting(config: RoutingConfig): Promise<void> {
    await saveProxySettings(config);
    const services = await listNetworkServices(config);
    try {
      for (const service of services) {
        await execute(NETWORKSETUP, ["-setautoproxyurl", service, pacURL(config)]);
        await execute(NETWORKSETUP, ["-setautoproxystate", service, "on"]);
      }
    } catch (error) {
      await restoreProxySettings(config);
      throw error;
    }
  }

  async function writePacFile(config: RoutingConfig): Promise<void> {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(PAC_FILE, buildPac(config));
  }

  async function writeFileIfChanged(filePath: string, contents: string): Promise<void> {
    try {
      if ((await fs.readFile(filePath, "utf8")) === contents) return;
    } catch (error) {
      const detail = error as NodeJS.ErrnoException;
      if (detail.code !== "ENOENT") throw error;
    }
    await fs.writeFile(filePath, contents);
  }

  async function enableLaunchAgent(label: string): Promise<void> {
    await execute(LAUNCHCTL, ["enable", launchdTarget(label)]);
  }

  async function disableLaunchAgent(label: string, filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch (error) {
      const detail = error as NodeJS.ErrnoException;
      if (detail.code === "ENOENT") return;
      throw error;
    }
    await execute(LAUNCHCTL, ["disable", launchdTarget(label)]);
  }

  async function startPacServer(config: RoutingConfig): Promise<void> {
    await writePacFile(config);
    await fs.mkdir(path.dirname(PAC_LAUNCH_AGENT_FILE), { recursive: true });

    if (await succeeds(LAUNCHCTL, ["print", launchdTarget(PAC_LAUNCHD_LABEL)])) {
      await succeeds(LAUNCHCTL, ["bootout", launchdTarget(PAC_LAUNCHD_LABEL)]);
    }

    const pacServer = [
      "from functools import partial",
      "from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer",
      "import sys",
      "",
      "class QuietHandler(SimpleHTTPRequestHandler):",
      "    def log_message(self, format, *args):",
      "        pass",
      "",
      "handler = partial(QuietHandler, directory=sys.argv[2])",
      'server = ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), handler)',
      "server.serve_forever()",
      "",
    ].join("\n");
    await writeFileIfChanged(PAC_SERVER_FILE, pacServer);

    const argumentsList = [PYTHON, PAC_SERVER_FILE, String(config.pacPort), STATE_DIR];
    const plist = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0"><dict>',
      "  <key>Label</key>",
      `  <string>${PAC_LAUNCHD_LABEL}</string>`,
      "  <key>ProgramArguments</key><array>",
      ...argumentsList.map((argument) => `    <string>${xmlEscape(argument)}</string>`),
      "  </array>",
      "  <key>RunAtLoad</key><true/>",
      "  <key>KeepAlive</key><true/>",
      `  <key>ThrottleInterval</key><integer>${LAUNCHD_THROTTLE_SECONDS}</integer>`,
      "  <key>ProcessType</key><string>Background</string>",
      "  <key>StandardOutPath</key>",
      `  <string>${xmlEscape(PAC_LOG_FILE)}</string>`,
      "  <key>StandardErrorPath</key>",
      `  <string>${xmlEscape(PAC_LOG_FILE)}</string>`,
      "</dict></plist>",
      "",
    ].join("\n");

    await writeFileIfChanged(PAC_LAUNCH_AGENT_FILE, plist);
    await enableLaunchAgent(PAC_LAUNCHD_LABEL);
    await execute(LAUNCHCTL, ["bootstrap", `gui/${uid}`, PAC_LAUNCH_AGENT_FILE]);
    if (!(await waitUntil(() => pacServerRunning(config), 5_000))) {
      throw new Error(`The local PAC server did not start on port ${config.pacPort}.`);
    }
  }

  async function stopPacServer(): Promise<void> {
    await disableLaunchAgent(PAC_LAUNCHD_LABEL, PAC_LAUNCH_AGENT_FILE);
    if (await succeeds(LAUNCHCTL, ["print", launchdTarget(PAC_LAUNCHD_LABEL)])) {
      await succeeds(LAUNCHCTL, ["bootout", launchdTarget(PAC_LAUNCHD_LABEL)]);
    }
  }

  async function startTunnel(config: Config): Promise<boolean> {
    if (await tunnelRunning(config)) return false;
    if (await isPortOpen(config.socksPort)) {
      throw new Error(`Port ${config.socksPort} is already in use by another process.`);
    }

    if (await succeeds(LAUNCHCTL, ["print", launchdTarget(SSH_LAUNCHD_LABEL)])) {
      await succeeds(LAUNCHCTL, ["bootout", launchdTarget(SSH_LAUNCHD_LABEL)]);
    }

    const argumentsList = [
      SSH,
      "-p",
      String(config.sshPort),
      "-D",
      `127.0.0.1:${config.socksPort}`,
      "-N",
      "-o",
      "BatchMode=yes",
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      `ServerAliveInterval=${SSH_SERVER_ALIVE_INTERVAL_SECONDS}`,
      "-o",
      "ServerAliveCountMax=3",
    ];
    if (config.identityFile) argumentsList.push("-i", config.identityFile);
    argumentsList.push(`${config.sshUser}@${config.sshHost}`);

    const plist = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0"><dict>',
      "  <key>Label</key>",
      `  <string>${SSH_LAUNCHD_LABEL}</string>`,
      "  <key>ProgramArguments</key><array>",
      ...argumentsList.map((argument) => `    <string>${xmlEscape(argument)}</string>`),
      "  </array>",
      "  <key>RunAtLoad</key><true/>",
      "  <key>KeepAlive</key><true/>",
      `  <key>ThrottleInterval</key><integer>${LAUNCHD_THROTTLE_SECONDS}</integer>`,
      "  <key>ProcessType</key><string>Background</string>",
      "  <key>StandardOutPath</key>",
      `  <string>${xmlEscape(SSH_LOG_FILE)}</string>`,
      "  <key>StandardErrorPath</key>",
      `  <string>${xmlEscape(SSH_LOG_FILE)}</string>`,
      "</dict></plist>",
      "",
    ].join("\n");

    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.mkdir(path.dirname(SSH_LAUNCH_AGENT_FILE), { recursive: true });
    await writeFileIfChanged(SSH_LAUNCH_AGENT_FILE, plist);
    await enableLaunchAgent(SSH_LAUNCHD_LABEL);
    await execute(LAUNCHCTL, ["bootstrap", `gui/${uid}`, SSH_LAUNCH_AGENT_FILE]);
    const ready = await waitUntil(() => tunnelRunning(config), config.startTimeoutMs);
    if (!ready) {
      await stopTunnel();
      throw new Error(`The SSH tunnel did not become ready on port ${config.socksPort}.`);
    }
    return true;
  }

  async function stopTunnel(): Promise<void> {
    await disableLaunchAgent(SSH_LAUNCHD_LABEL, SSH_LAUNCH_AGENT_FILE);
    if (await succeeds(LAUNCHCTL, ["print", launchdTarget(SSH_LAUNCHD_LABEL)])) {
      await succeeds(LAUNCHCTL, ["bootout", launchdTarget(SSH_LAUNCHD_LABEL)]);
    }
  }

  function getPrimaryURL(): string {
    return config.primaryURL;
  }

  function getRoutedWebsites(): RoutedWebsite[] {
    const primaryHost = new URL(config.primaryURL).hostname;
    const websites: RoutedWebsite[] = [{ title: primaryHost, url: config.primaryURL }];
    for (const rule of config.routedHosts) {
      const title = rule.wildcard ? `*.${rule.host}` : rule.host;
      const url = `https://${rule.host}`;
      if (!websites.some((website) => website.title === title || website.url === url)) websites.push({ title, url });
    }
    return websites;
  }

  async function getProxyStatus(): Promise<ProxyStatus> {
    const [sshAgent, pacAgent, hasProxyBackup] = await Promise.all([
      launchdJobInfo(SSH_LAUNCHD_LABEL),
      launchdJobInfo(PAC_LAUNCHD_LABEL),
      fileExists(PROXY_BACKUP_FILE),
    ]);

    if (!sshAgent.loaded && !pacAgent.loaded && !hasProxyBackup) {
      return {
        running: false,
        degraded: false,
        detail: "Stopped — all websites use the normal network route.",
        tunnel: false,
        pacServer: false,
        routing: false,
      };
    }

    const [socksPort, pacPort, routing] = await Promise.all([
      isPortOpen(config.socksPort),
      isPortOpen(config.pacPort),
      routingConfigured(config),
    ]);
    const tunnel = sshAgent.loaded && socksPort;
    const pacServer = pacAgent.loaded && pacPort;
    const running = tunnel && pacServer && routing;
    const degraded = !running;
    const sshRetryDetail = [
      sshAgent.state ? `launchd ${sshAgent.state}` : undefined,
      sshAgent.runs !== undefined ? `attempt ${sshAgent.runs}` : undefined,
      sshAgent.lastExitCode !== undefined ? `last exit code ${sshAgent.lastExitCode}` : undefined,
    ]
      .filter(Boolean)
      .join(", ");
    const detail = running
      ? `Running — ${config.routedHosts.length} host rule${config.routedHosts.length === 1 ? " uses" : "s use"} SOCKS on localhost:${config.socksPort}.`
      : sshAgent.loaded && !socksPort
        ? `Reconnecting — SSH ${sshRetryDetail || "is not ready"}; retries at most once per minute.`
        : `Degraded — tunnel ${tunnel ? "on" : "off"}, PAC ${pacServer ? "on" : "off"}, routing ${routing ? "on" : "off"}.`;
    return { running, degraded, detail, tunnel, pacServer, routing };
  }

  async function startProxy(): Promise<string> {
    if (!("sshUser" in config)) throw new Error("Starting the router requires SSH configuration.");
    const alreadyRunning = await getProxyStatus();
    if (alreadyRunning.running)
      return `Already running with ${config.routedHosts.length} routed host rule${config.routedHosts.length === 1 ? "" : "s"}.`;

    let startedTunnel = false;
    try {
      startedTunnel = await startTunnel(config);
      await startPacServer(config);
      await enableRouting(config);
    } catch (error) {
      try {
        await restoreProxySettings(config);
      } catch {
        // Keep the original startup error.
      }
      const cleanupErrors: string[] = [];
      for (const cleanup of [stopPacServer, ...(startedTunnel ? [stopTunnel] : [])]) {
        try {
          await cleanup();
        } catch (cleanupError) {
          cleanupErrors.push(errorMessage(cleanupError));
        }
      }
      throw new Error(
        `Could not start SSH Proxy Router: ${errorMessage(error)}${cleanupErrors.length ? `; cleanup: ${cleanupErrors.join("; ")}` : ""}`,
      );
    }

    return `Running — ${config.routedHosts.length} host rule${config.routedHosts.length === 1 ? "" : "s"} routed through SSH.`;
  }

  async function stopProxy(): Promise<string> {
    const errors: string[] = [];
    try {
      await restoreProxySettings(config);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      await stopPacServer();
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      await stopTunnel();
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (errors.length) throw new Error(`Could not fully stop SSH Proxy Router: ${errors.join("; ")}`);
    return "Stopped — previous macOS proxy settings restored.";
  }

  async function toggleProxy(): Promise<{ running: boolean; message: string }> {
    const status = await getProxyStatus();
    if (status.running) return { running: false, message: await stopProxy() };
    return { running: true, message: await startProxy() };
  }

  async function diagnosticConfig(): Promise<DiagnosticConfig> {
    return {
      schemaVersion: 1,
      routedHosts: config.routedHosts,
      primaryURL: config.primaryURL,
      socksPort: config.socksPort,
      pacPort: config.pacPort,
      networkServices: await listNetworkServices(config),
    };
  }

  async function runDiagnostics(): Promise<DiagnosticReport> {
    const checks: DiagnosticCheck[] = [];
    async function check(name: string, action: () => Promise<string>): Promise<boolean> {
      try {
        checks.push({ name, status: "pass", detail: await action() });
        return true;
      } catch (error) {
        checks.push({ name, status: "fail", detail: errorMessage(error) });
        return false;
      }
    }
    function skip(name: string, detail: string) {
      checks.push({ name, status: "skipped", detail });
    }
    const sshLoaded = await check("SSH LaunchAgent", async () => {
      const job = await launchdJobInfo(SSH_LAUNCHD_LABEL);
      if (!job.loaded) throw new Error("Not loaded; start the router in Raycast.");
      return `Loaded (${job.state ?? "unknown state"}, last exit ${job.lastExitCode ?? "unknown"})`;
    });
    const pacLoaded = await check("PAC LaunchAgent", async () => {
      if (!(await launchdJobInfo(PAC_LAUNCHD_LABEL)).loaded) throw new Error("Not loaded.");
      return "Loaded";
    });
    const socksOpen = await check("SOCKS listener", async () => {
      if (!(await isPortOpen(config.socksPort))) throw new Error(`Port ${config.socksPort} is closed.`);
      return `127.0.0.1:${config.socksPort}`;
    });
    const pacOpen = await check("PAC listener", async () => {
      if (!(await isPortOpen(config.pacPort))) throw new Error(`Port ${config.pacPort} is closed.`);
      return `127.0.0.1:${config.pacPort}`;
    });
    let services: string[] = [];
    await check("Network services", async () => {
      services = await listNetworkServices(config);
      if (!services.length) throw new Error("No network services configured.");
      return `${services.length} services`;
    });
    for (const service of services) {
      await check(`PAC settings: ${service}`, async () => {
        const setting = await getAutomaticProxy(service);
        if (!setting.enabled || setting.url !== pacURL(config))
          throw new Error("PAC is disabled or its URL differs from the active snapshot; refresh or repair the router.");
        return "Enabled with expected URL";
      });
    }
    if (pacLoaded && pacOpen) {
      let script = "";
      const contentMatches = await check("PAC content", async () => {
        script = await execute(
          CURL,
          [
            "-q",
            "--noproxy",
            "*",
            "--proxy",
            "",
            "--silent",
            "--show-error",
            "--fail",
            "--max-time",
            "5",
            pacURL(config),
          ],
          6_000,
        );
        if (script.trim() !== buildPac(config).trim())
          throw new Error("Served PAC differs from the active snapshot; repair the router.");
        return "Matches expected routing configuration";
      });
      if (contentMatches) {
        await check("PAC routing decisions", async () => {
          const samples = new Set(
            config.routedHosts.flatMap((rule) => [
              rule.host,
              rule.host.toUpperCase(),
              `probe.${rule.host}`,
              `not-${rule.host}`,
            ]),
          );
          let suffix = 0;
          let unrelated = `headless-proxy-check.invalid${suffix}`;
          while (matchesRoute(unrelated, config.routedHosts)) unrelated = `headless-proxy-check.invalid${++suffix}`;
          samples.add(unrelated);
          for (const host of samples) {
            const expected = matchesRoute(host, config.routedHosts) ? `SOCKS 127.0.0.1:${config.socksPort}` : "DIRECT";
            if (evaluatePac(script, host) !== expected) throw new Error(`Unexpected route for ${host}.`);
          }
          return `${samples.size} matching and nonmatching host cases passed`;
        });
      } else skip("PAC routing decisions", "PAC content did not match; evaluation skipped.");
    } else {
      skip("PAC content", "PAC agent or listener is unavailable.");
      skip("PAC routing decisions", "PAC server is unavailable.");
    }
    const targets = [config.primaryURL];
    for (const rule of config.routedHosts.filter((rule) => !rule.wildcard)) {
      if (!targets.some((target) => new URL(target).hostname === rule.host)) targets.push(`https://${rule.host}`);
    }
    for (const target of targets) {
      const name = `Website: ${new URL(target).hostname}`;
      if (!sshLoaded || !socksOpen) {
        skip(name, "SSH agent or SOCKS listener is unavailable.");
        continue;
      }
      await check(name, async () => {
        const status = await execute(
          CURL,
          [
            "-q",
            "--socks5-hostname",
            `127.0.0.1:${config.socksPort}`,
            "--noproxy",
            "",
            "--silent",
            "--show-error",
            "--max-time",
            "20",
            "--output",
            "/dev/null",
            "--write-out",
            "%{http_code}",
            target,
          ],
          25_000,
        );
        if (!/^[1-5]\d{2}$/.test(status)) throw new Error(`No HTTP response (${status}).`);
        return `HTTP ${status} through SOCKS (reachability, not application health)`;
      });
    }
    return { passed: checks.every((check) => check.status === "pass"), checks };
  }

  return {
    getPrimaryURL,
    getRoutedWebsites,
    getProxyStatus,
    startProxy,
    stopProxy,
    toggleProxy,
    diagnosticConfig,
    runDiagnostics,
  };
}

export function matchesRoute(host: string, rules: RouteRule[]): boolean {
  const normalized = host.toLowerCase();
  return rules.some((rule) => normalized === rule.host || (rule.wildcard && normalized.endsWith(`.${rule.host}`)));
}

export function evaluatePac(script: string, host: string): unknown {
  return runInNewContext(
    `${script}\nFindProxyForURL(url, host)`,
    {
      host,
      url: `https://${host}/`,
      dnsDomainIs: (candidate: string, domain: string) => candidate.endsWith(domain),
    },
    { timeout: 100, contextCodeGeneration: { strings: false, wasm: false } },
  );
}
