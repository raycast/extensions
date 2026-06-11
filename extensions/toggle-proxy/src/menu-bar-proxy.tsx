import { MenuBarExtra, getPreferenceValues, showToast, Toast, Icon, Color, environment, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { execaCommand } from "execa";
import { tmux, ENV_PATH } from "./utils/exec";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as net from "net";
import { getXrayPath } from "./utils/xray-config";
import { loadSubscriptionConfigs, getSubscriptions, updateSubscription } from "./utils/subscription";
import { safePort, sanitizeShellArg, shellEscape } from "./utils/types";
import { realDelayBatch, type BatchEntry } from "./utils/real-delay";
import { getSubRules, patchConfigWithSubRules, resolveSubSlug } from "./utils/routing-rules";

const cache = new Cache({ namespace: "menu-bar-proxy" });

function getProxySessionName(configName: string): string {
  const encodedName = Buffer.from(configName.replace(/\.json$/i, ""), "utf8").toString("base64url");
  return `toggle-proxy-${encodedName}`;
}

function getLaunchTempPath(sessionName: string): string {
  return path.join(os.tmpdir(), `toggle-proxy-launch-${sessionName}.json`);
}

function getConfigNameFromSession(sessionName: string): string | null {
  if (!sessionName.startsWith("toggle-proxy-")) {
    return null;
  }

  try {
    return Buffer.from(sessionName.slice("toggle-proxy-".length), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export default function MenuBarProxy() {
  const prefs = getPreferenceValues<Preferences>();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isTmuxInstalled, setIsTmuxInstalled] = useState<boolean | null>(null);
  const [currentConfig, setCurrentConfig] = useState<string | null>(null);
  const [availableConfigs, setAvailableConfigs] = useState<string[]>([]);
  const [subscriptionConfigs, setSubscriptionConfigs] = useState<
    Record<string, { displayName: string; relativePath: string }[]>
  >({});
  const [pings, setPings] = useState<Record<string, number | null>>({});
  const [isPinging, setIsPinging] = useState(false);
  const sortByPing = prefs.sortByPing ?? false;

  useEffect(() => {
    checkProxy();
    checkTmuxInstalled();
    getCurrentConfig();
    loadAvailableConfigs();
    autoUpdateSubscriptions();
    autoTestRealDelay();
  }, []);

  async function autoTestRealDelay() {
    const PINGS_KEY = "real_delay_data";
    const PINGS_TTL = 60000;

    const cached = cache.get(PINGS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { pings: Record<string, number | null>; timestamp: number };
        setPings(parsed.pings);
        if (Date.now() - parsed.timestamp < PINGS_TTL) {
          return;
        }
      } catch {
        // fall through and re-test
      }
    }

    const xrayPath = getXrayPathLocal();
    const entries: BatchEntry[] = [];

    try {
      if (fs.existsSync(xrayPath)) {
        const files = fs
          .readdirSync(xrayPath)
          .filter((f) => f.endsWith(".json"))
          .sort();
        for (const f of files) entries.push({ key: f, configPath: path.join(xrayPath, f) });
      }
    } catch {
      // ignore
    }

    const subConfigs = loadSubscriptionConfigs(prefs.xrayPath);
    for (const configs of Object.values(subConfigs)) {
      for (const c of configs) {
        entries.push({ key: c.relativePath, configPath: path.join(xrayPath, c.relativePath) });
      }
    }

    if (entries.length === 0) return;

    setIsPinging(true);
    try {
      const results = await realDelayBatch(entries, xrayPath, {
        onResult: (key, latency) => {
          setPings((prev) => ({ ...prev, [key]: latency }));
        },
      });
      cache.set(PINGS_KEY, JSON.stringify({ pings: results, timestamp: Date.now() }));
    } finally {
      setIsPinging(false);
    }
  }

  function formatPing(key: string): string | undefined {
    const p = pings[key];
    if (p === undefined) return isPinging ? "  ·  …" : undefined;
    if (p === null) return "  ·  —";
    return `  ·  ${p}ms`;
  }

  function pingRank(key: string): number {
    const p = pings[key];
    if (typeof p === "number") return p;
    if (p === null) return Number.MAX_SAFE_INTEGER - 1;
    return Number.MAX_SAFE_INTEGER;
  }

  async function autoUpdateSubscriptions() {
    const SUB_CACHE_KEY = "subscriptions_last_update";
    const SUB_CACHE_TTL = 15000;

    const lastUpdate = cache.get(SUB_CACHE_KEY);
    if (lastUpdate && Date.now() - parseInt(lastUpdate) < SUB_CACHE_TTL) {
      return;
    }

    try {
      const subs = await getSubscriptions();
      for (const sub of subs) {
        try {
          await updateSubscription(sub.id, prefs);
        } catch (e) {
          console.log(`Auto-update failed for ${sub.name}:`, e);
        }
      }
      cache.set(SUB_CACHE_KEY, String(Date.now()));
      setSubscriptionConfigs(loadSubscriptionConfigs(prefs.xrayPath));
    } catch (e) {
      console.log("Auto-update subscriptions error:", e);
    }
  }

  function getXrayPathLocal(): string {
    return getXrayPath(prefs.xrayPath);
  }

  function loadAvailableConfigs() {
    try {
      const xrayPath = getXrayPathLocal();
      const cacheKey = `configs_${xrayPath}`;

      const cached = cache.get(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const cacheAge = Date.now() - cachedData.timestamp;

          if (cacheAge < 30000) {
            setAvailableConfigs(cachedData.configs);
            setSubscriptionConfigs(loadSubscriptionConfigs(prefs.xrayPath));
            return;
          }
        } catch {
          console.log("Invalid cached data, refreshing...");
        }
      }

      const configs: string[] = [];

      if (fs.existsSync(xrayPath)) {
        const files = fs
          .readdirSync(xrayPath)
          .filter((file) => file.endsWith(".json"))
          .sort();

        configs.push(...files);
      }

      if (configs.length === 0) {
        configs.push("config.json");
      }

      const cacheData = {
        configs,
        timestamp: Date.now(),
      };
      cache.set(cacheKey, JSON.stringify(cacheData));

      setAvailableConfigs(configs);

      const subConfigs = loadSubscriptionConfigs(prefs.xrayPath);
      setSubscriptionConfigs(subConfigs);
    } catch (error) {
      console.log("Error loading configs:", error);
      setAvailableConfigs(["config.json"]);
    }
  }

  async function getCurrentConfig(): Promise<void> {
    try {
      const sessions = await tmux("list-sessions -F '#{session_name}'");
      const sessionLines = sessions.stdout.split("\n").filter((line) => line.trim());

      for (const sessionName of sessionLines) {
        const configName = getConfigNameFromSession(sessionName);
        if (configName) {
          setCurrentConfig(configName);
          return;
        }
      }
      setCurrentConfig(null);
    } catch {
      setCurrentConfig(null);
    }
  }

  async function checkTmuxInstalled() {
    try {
      await tmux("has-session -t non-existent-session 2>/dev/null || true");
      setIsTmuxInstalled(true);
    } catch (error) {
      setIsTmuxInstalled(false);

      const logDir = path.join(environment.supportPath, "logs");
      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(
          path.join(logDir, "tmux-check.log"),
          `${new Date().toISOString()} - Tmux not installed or not in PATH: ${JSON.stringify(error)}\n`,
        );
      } catch (e) {
        console.error("Failed to write to log file:", e);
      }
    }
  }

  async function isPortInUse(host: string, port: string): Promise<boolean> {
    return await new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (result: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(150);
      socket.once("connect", () => finish(true));
      socket.once("timeout", () => finish(false));
      socket.once("error", () => finish(false));
      socket.connect(parseInt(safePort(port), 10), host);
    });
  }

  function getNetworkInterface(): string {
    return sanitizeShellArg(prefs.networkInterface || "Wi-Fi");
  }

  async function checkProxy() {
    try {
      const { stdout } = await execaCommand(`/usr/sbin/networksetup -getsocksfirewallproxy ${getNetworkInterface()}`);
      setIsEnabled(stdout.includes("Yes"));
    } catch {
      setIsEnabled(false);
    }
  }

  async function waitForPortToOpen(host: string, port: string, maxAttempts = 10, delayMs = 500): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await isPortInUse(host, port)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  async function stopAllProxySessions() {
    try {
      const sessions = await tmux("list-sessions -F '#{session_name}'");
      const sessionLines = sessions.stdout.split("\n").filter((line) => line.trim());

      for (const sessionName of sessionLines) {
        if (sessionName.startsWith("toggle-proxy-")) {
          const safeName = sanitizeShellArg(sessionName);
          await tmux(`kill-session -t ${safeName}`);
          try {
            fs.unlinkSync(getLaunchTempPath(sessionName));
          } catch {
            // ignore — temp file may not exist
          }
        }
      }
      setCurrentConfig(null);
    } catch (error) {
      console.log("No sessions to stop or error stopping:", error);
    }
  }

  async function startProxyWithConfig(configName: string) {
    try {
      const xrayPath = getXrayPathLocal();
      const host = sanitizeShellArg(prefs.host || "127.0.0.1");
      const port = safePort(prefs.port);

      if (!isTmuxInstalled) {
        showToast(
          Toast.Style.Failure,
          "Tmux is not installed or not found in PATH",
          "Install tmux or add it to your PATH",
        );
        return false;
      }

      if (!fs.existsSync(xrayPath)) {
        showToast(Toast.Style.Failure, `Xray directory not found: ${xrayPath}`);
        return false;
      }

      const configPath = path.join(xrayPath, configName);
      if (!fs.existsSync(configPath)) {
        showToast(Toast.Style.Failure, `Config not found: ${configPath}`);
        return false;
      }

      await stopAllProxySessions();

      const sessionName = getProxySessionName(configName);
      let configForLaunch = configPath;

      const subSlug = resolveSubSlug(configName);
      if (subSlug) {
        const rules = await getSubRules(subSlug);
        if (rules) {
          try {
            const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            const patched = patchConfigWithSubRules(cfg, rules);
            const tempPath = getLaunchTempPath(sessionName);
            fs.writeFileSync(tempPath, JSON.stringify(patched));
            configForLaunch = tempPath;
          } catch (e) {
            console.log("Failed to apply routing rules, launching original config:", e);
          }
        }
      }

      const safeConfigPath = shellEscape(configForLaunch);
      const safeXrayPath = shellEscape(xrayPath);
      const xrayBin = fs.existsSync(path.join(xrayPath, "xray")) ? "./xray" : "xray";
      const cmd = `new-session -d -s ${shellEscape(sessionName)} "export PATH='${ENV_PATH}' && cd ${safeXrayPath} && ${xrayBin} -config ${safeConfigPath}; echo EXIT_CODE=\\$?; sleep 30"`;

      await tmux(cmd);

      const isStarted = await waitForPortToOpen(host, port, 15, 150);

      if (isStarted) {
        setCurrentConfig(configName.replace(".json", ""));
        showToast(Toast.Style.Success, `Proxy started with config: ${configName}`);
        return true;
      } else {
        try {
          const sessionOutput = await tmux(`capture-pane -t ${shellEscape(sessionName)} -p`);
          const logDir = path.join(environment.supportPath, "logs");
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          fs.appendFileSync(
            path.join(logDir, "proxy-errors.log"),
            `${new Date().toISOString()} - Failed to start proxy with config ${configName}. Session output:\n${sessionOutput.stdout}\n`,
          );
        } catch (captureError) {
          console.log("Could not capture session output:", captureError);
          console.log("Debug info:", {
            ENV_PATH,
            xrayPath,
            xrayBin: fs.existsSync(path.join(xrayPath, "xray")) ? "./xray" : "xray",
            configName,
            configExists: fs.existsSync(path.join(xrayPath, configName)),
          });
        }

        showToast(Toast.Style.Failure, "Failed to start proxy. Check config and logs");
        return false;
      }
    } catch (error) {
      const logDir = path.join(environment.supportPath, "logs");
      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(
          path.join(logDir, "proxy-errors.log"),
          `${new Date().toISOString()} - Tmux error: ${JSON.stringify(error)}\n`,
        );
      } catch (e) {
        console.error("Failed to write to log file:", e);
      }

      showToast(Toast.Style.Failure, "Tmux launch error. Check logs");
      return false;
    }
  }

  async function toggleProxy(configName?: string) {
    if (isEnabled && !configName) {
      try {
        await execaCommand(`/usr/sbin/networksetup -setsocksfirewallproxystate ${getNetworkInterface()} off`);
        await stopAllProxySessions();
        showToast(Toast.Style.Success, "Proxy disabled");
        setIsEnabled(false);
      } catch {
        showToast(Toast.Style.Failure, "Failed to disable proxy");
      }
    } else {
      try {
        const host = sanitizeShellArg(prefs.host || "127.0.0.1");
        const port = safePort(prefs.port);
        const configToUse = configName || prefs.defaultConfig || "config.json";

        if (isEnabled && currentConfig === configToUse.replace(".json", "")) {
          showToast(Toast.Style.Success, `Config ${configToUse} is already active`);
          return;
        }

        const xrayPath = prefs.xrayPath;
        if (!xrayPath) {
          showToast(Toast.Style.Failure, "Xray path is not specified");
          return;
        }

        const started = await startProxyWithConfig(configToUse);
        if (!started) {
          return;
        }

        await execaCommand(`/usr/sbin/networksetup -setsocksfirewallproxy ${getNetworkInterface()} ${host} ${port}`);
        await execaCommand(`/usr/sbin/networksetup -setsocksfirewallproxystate ${getNetworkInterface()} on`);
        showToast(Toast.Style.Success, `Proxy ${host}:${port} enabled with config: ${configToUse}`);
        setIsEnabled(true);
      } catch (e) {
        console.log(e);
        showToast(Toast.Style.Failure, "Failed to enable proxy");
      }
    }
  }

  function isCurrentConfig(configName: string): boolean {
    return currentConfig === configName.replace(/\.json$/i, "");
  }

  function sortByNodeThenPing(
    configs: { displayName: string; relativePath: string }[],
  ): { displayName: string; relativePath: string }[] {
    if (!sortByPing) return configs;

    const groups = new Map<string, { displayName: string; relativePath: string }[]>();
    const ungrouped: { displayName: string; relativePath: string }[] = [];

    for (const c of configs) {
      const idx = c.displayName.indexOf("-=-");
      if (idx === -1) {
        ungrouped.push(c);
        continue;
      }
      const node = c.displayName.slice(0, idx);
      const list = groups.get(node);
      if (list) {
        list.push(c);
      } else {
        groups.set(node, [c]);
      }
    }

    for (const list of groups.values()) {
      list.sort((a, b) => pingRank(a.relativePath) - pingRank(b.relativePath));
    }
    ungrouped.sort((a, b) => pingRank(a.relativePath) - pingRank(b.relativePath));

    const sortedNodes = [...groups.keys()].sort();
    return [...sortedNodes.flatMap((n) => groups.get(n) ?? []), ...ungrouped];
  }

  function renderSubscriptionSections() {
    return Object.entries(subscriptionConfigs).map(([subName, configs]) => {
      const sorted = sortByNodeThenPing(configs);
      return (
        <MenuBarExtra.Section key={subName} title={subName}>
          {sorted.map((config) => (
            <MenuBarExtra.Item
              key={config.relativePath}
              title={config.displayName}
              subtitle={formatPing(config.relativePath)}
              onAction={() => toggleProxy(config.relativePath)}
              icon={
                isCurrentConfig(config.relativePath) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Globe
              }
            />
          ))}
        </MenuBarExtra.Section>
      );
    });
  }

  function getSortedRootConfigs(): string[] {
    if (!sortByPing) return availableConfigs;
    return [...availableConfigs].sort((a, b) => pingRank(a) - pingRank(b));
  }

  return (
    <MenuBarExtra
      isLoading={isEnabled === null || isPinging}
      icon={isEnabled ? Icon.BullsEyeMissed : Icon.BullsEye}
      tooltip={
        isTmuxInstalled === false
          ? "Tmux is not installed"
          : currentConfig
            ? `Active config: ${currentConfig}`
            : undefined
      }
    >
      {isEnabled ? (
        <>
          <MenuBarExtra.Item title="Disable Proxy" onAction={() => toggleProxy()} />
          <MenuBarExtra.Section title="Switch Config:">
            {getSortedRootConfigs().map((config) => (
              <MenuBarExtra.Item
                key={config}
                title={config}
                subtitle={formatPing(config)}
                onAction={() => toggleProxy(config)}
                icon={
                  isCurrentConfig(config)
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : config === prefs.defaultConfig
                      ? Icon.Star
                      : Icon.Document
                }
              />
            ))}
          </MenuBarExtra.Section>
          {renderSubscriptionSections()}
        </>
      ) : (
        <>
          <MenuBarExtra.Item
            title="Enable Proxy (Default)"
            onAction={() => toggleProxy()}
            tooltip={isTmuxInstalled === false ? "Tmux installation required" : undefined}
          />
          {availableConfigs.length > 1 && (
            <MenuBarExtra.Section title="Select Config:">
              {getSortedRootConfigs().map((config) => (
                <MenuBarExtra.Item
                  key={config}
                  title={config}
                  subtitle={formatPing(config)}
                  onAction={() => toggleProxy(config)}
                  icon={config === prefs.defaultConfig ? Icon.Star : Icon.Document}
                />
              ))}
            </MenuBarExtra.Section>
          )}
          {renderSubscriptionSections()}
        </>
      )}

      {isTmuxInstalled === false && (
        <MenuBarExtra.Section title="Info:">
          <MenuBarExtra.Item title="Tmux is not installed" tooltip="Install tmux to use the proxy" />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
