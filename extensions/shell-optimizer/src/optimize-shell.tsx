import React from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { homedir } from "os";

interface Preferences {
  shellType: "zsh" | "bash";
  backupLocation: string;
}

interface ShellMetrics {
  startupTime: number;
  pluginCount: number;
  configSize: number;
  aliasCount: number;
  functionCount: number;
  environmentVars: number;
  sourcedFiles: number;
  pathLength: number;
  historySize: number;
  completionCount: number;
}

interface OptimizationSuggestion {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  action: () => Promise<void>;
}

// Add new interfaces
interface PluginInfo {
  name: string;
  lastUsed?: Date;
  impact: "high" | "medium" | "low";
}

interface BackupInfo {
  path: string;
  date: Date;
  size: number;
  metrics?: ShellMetrics;
  description?: string;
}

export default function OptimizeShell() {
  const [metrics, setMetrics] = useState<ShellMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);

  useEffect(() => {
    analyzeShell();
  }, []);

  async function analyzeShell() {
    try {
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", homedir());

      // Measure startup time with multiple runs for accuracy
      const runs = 3;
      let totalTime = 0;
      for (let i = 0; i < runs; i++) {
        const startTime = performance.now();
        execSync(`${preferences.shellType} -i -c exit`);
        totalTime += performance.now() - startTime;
      }

      const configContent = fs.readFileSync(expandedPath, "utf-8");

      // Enhanced analysis
      const metrics = {
        startupTime: totalTime / runs,
        pluginCount: (configContent.match(/plugin|source/g) || []).length,
        configSize: configContent.length,
        aliasCount: (configContent.match(/alias\s+/g) || []).length,
        functionCount: (configContent.match(/function\s+\w+|^\w+\(\)/gm) || [])
          .length,
        environmentVars: (configContent.match(/export\s+\w+/g) || []).length,
        sourcedFiles: (configContent.match(/source|\.$/gm) || []).length,
        pathLength: process.env.PATH?.split(":").length || 0,
        historySize: fs.existsSync(
          `${homedir()}/.${preferences.shellType}_history`,
        )
          ? fs.statSync(`${homedir()}/.${preferences.shellType}_history`).size
          : 0,
        completionCount: (configContent.match(/compdef|complete/g) || [])
          .length,
      };

      setMetrics(metrics);
      analyzeSuggestions(configContent, metrics);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to analyze shell",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function analyzeSuggestions(config: string, metrics: ShellMetrics) {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for common performance issues
    if (metrics.startupTime > 500) {
      suggestions.push({
        title: "High Startup Time",
        description: "Your shell takes longer than 500ms to start",
        severity: "high",
        action: optimizeConfiguration,
      });
    }

    if (config.includes("source $NVM_DIR/nvm.sh")) {
      suggestions.push({
        title: "NVM Slow Loading",
        description: "Consider lazy loading NVM for faster startup",
        severity: "medium",
        action: async () => await optimizeNvm(),
      });
    }

    if (metrics.pluginCount > 20) {
      suggestions.push({
        title: "Too Many Plugins",
        description: "Consider removing unused plugins",
        severity: "medium",
        action: async () => await reviewPlugins(),
      });
    }

    setSuggestions(suggestions);
  }

  async function optimizeNvm() {
    try {
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", homedir());
      let config = fs.readFileSync(expandedPath, "utf-8");

      // Create backup before modifying
      await createBackup(expandedPath);

      // Replace NVM loading with lazy loading
      config = config.replace(
        /source\s+.*nvm\.sh.*/g,
        `# Lazy load NVM for better startup time
export NVM_LAZY_LOAD=true
export NVM_LAZY_LOAD_EXTRA_COMMANDS=("npm" "npx" "node" "nvm")
[ -s "$NVM_DIR/lazy.sh" ] && . "$NVM_DIR/lazy.sh"`,
      );

      fs.writeFileSync(expandedPath, config);
      showToast({
        style: Toast.Style.Success,
        title: "NVM Optimized",
        message: "NVM now uses lazy loading",
      });

      await analyzeShell();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "NVM Optimization Failed",
        message: String(error),
      });
    }
  }

  async function reviewPlugins() {
    try {
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", homedir());
      const config = fs.readFileSync(expandedPath, "utf-8");

      // Extract plugins
      const pluginMatches = config.match(/plugins=\((.*?)\)/s);
      if (pluginMatches) {
        const pluginList = pluginMatches[1].split(/\s+/);
        const pluginsInfo: PluginInfo[] = pluginList.map((name) => ({
          name: name.trim(),
          impact: getPluginImpact(name),
        }));
        setPlugins(pluginsInfo);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Plugins Analyzed",
        message: `Found ${plugins.length} plugins`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Plugin Analysis Failed",
        message: String(error),
      });
    }
  }

  function getPluginImpact(pluginName: string): "high" | "medium" | "low" {
    const impacts: Record<string, "high" | "medium" | "low"> = {
      "oh-my-zsh": "high",
      nvm: "high",
      rvm: "high",
      sdkman: "high",
      pyenv: "high",
      rbenv: "high",
      git: "medium",
      docker: "medium",
      kubectl: "medium",
      aws: "medium",
      terraform: "medium",
      yarn: "medium",
      npm: "medium",
      pip: "medium",
      golang: "medium",
      rust: "medium",
      // Low impact plugins
      "alias-finder": "low",
      "colored-man-pages": "low",
      extract: "low",
      z: "low",
    };

    return impacts[pluginName] || "low";
  }

  async function createBackup(configPath: string, description?: string) {
    const backupPath = path.join(
      preferences.backupLocation.replace("~", homedir()),
      `${preferences.shellType}rc_backup_${Date.now()}`,
    );

    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(configPath, backupPath);

    const stats = fs.statSync(backupPath);
    const newBackup: BackupInfo = {
      path: backupPath,
      date: new Date(),
      size: stats.size,
      metrics: metrics || undefined,
      description,
    };

    setBackups((prev) => [...prev, newBackup]);

    // Clean up old backups (keep last 10)
    if (backups.length > 10) {
      const oldBackup = backups[0];
      fs.unlinkSync(oldBackup.path);
      setBackups((prev) => prev.slice(1));
    }

    return backupPath;
  }

  async function restoreBackup(backup: BackupInfo) {
    try {
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", homedir());

      // Create a backup of current config before restoring
      await createBackup(expandedPath);

      // Restore the selected backup
      fs.copyFileSync(backup.path, expandedPath);

      showToast({
        style: Toast.Style.Success,
        title: "Backup Restored",
        message: `Restored configuration from ${backup.date.toLocaleDateString()}`,
      });

      await analyzeShell();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Restore Failed",
        message: String(error),
      });
    }
  }

  async function optimizeConfiguration() {
    const confirmed = await confirmAlert({
      title: "Optimize Shell Configuration",
      message:
        "This will modify your shell configuration. A backup will be created. Continue?",
      primaryAction: {
        title: "Optimize",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      // Create backup
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", process.env.HOME!);
      const backupPath = path.join(
        preferences.backupLocation.replace("~", process.env.HOME!),
        `${preferences.shellType}rc_backup_${Date.now()}`,
      );

      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(expandedPath, backupPath);

      // Perform optimizations
      let config = fs.readFileSync(expandedPath, "utf-8");

      // Add lazy loading for heavy tools
      config = config.replace(
        /source\s+.*nvm\.sh.*/g,
        'export NVM_LAZY_LOAD=true\nexport NVM_LAZY_LOAD_EXTRA_COMMANDS=("npm" "npx" "node")',
      );

      // Deduplicate PATH
      config +=
        '\nexport PATH="$(perl -e \'print join(":", grep { not $seen{$_}++ } split(/:/, $ENV{PATH}))\')"';

      // Write optimized config
      fs.writeFileSync(expandedPath, config);

      showToast({
        style: Toast.Style.Success,
        title: "Shell optimized",
        message: "Configuration updated and backup created",
      });

      // Refresh metrics
      await analyzeShell();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Optimization failed",
        message: String(error),
      });
    }
  }

  // Add new optimization functions
  async function optimizeHistory() {
    try {
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", homedir());
      const config = fs.readFileSync(expandedPath, "utf-8");
      const historyOptimizations = `
# History optimization
export HISTSIZE=10000
export SAVEHIST=10000
export HISTFILE=~/.${preferences.shellType}_history
setopt HIST_EXPIRE_DUPS_FIRST
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt HIST_VERIFY
setopt SHARE_HISTORY`;

      await updateConfig(config + historyOptimizations);
      showToast({
        style: Toast.Style.Success,
        title: "History settings optimized",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "History optimization failed",
      });
    }
  }

  async function optimizeCompletions() {
    try {
      const configPath =
        preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
      const expandedPath = configPath.replace("~", homedir());
      const config = fs.readFileSync(expandedPath, "utf-8");
      const completionOptimizations = `
# Completion optimization
zstyle ':completion:*' accept-exact '*(N)'
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path ~/.zsh/cache`;

      await updateConfig(config + completionOptimizations);
      showToast({ style: Toast.Style.Success, title: "Completions optimized" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Completion optimization failed",
      });
    }
  }

  // Helper function for updating config
  async function updateConfig(newContent: string) {
    const configPath =
      preferences.shellType === "zsh" ? "~/.zshrc" : "~/.bashrc";
    const expandedPath = configPath.replace("~", homedir());
    await createBackup(expandedPath);
    fs.writeFileSync(expandedPath, newContent);
    await analyzeShell();
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Shell Metrics">
        {metrics && (
          <>
            <List.Item
              title="Startup Time"
              subtitle={`${metrics.startupTime.toFixed(2)}ms`}
              icon={
                metrics.startupTime > 500 ? Icon.ExclamationMark : Icon.Clock
              }
              accessories={[
                { text: metrics.startupTime > 500 ? "Slow" : "Good" },
              ]}
            />
            <List.Item
              title="Plugin Count"
              subtitle={`${metrics.pluginCount} plugins`}
              icon={metrics.pluginCount > 20 ? Icon.ExclamationMark : Icon.Plug}
            />
            <List.Item
              title="Aliases"
              subtitle={`${metrics.aliasCount} defined`}
              icon={Icon.Terminal}
            />
            <List.Item
              title="Functions"
              subtitle={`${metrics.functionCount} defined`}
              icon={Icon.Code}
            />
            <List.Item
              title="Environment Variables"
              subtitle={`${metrics.environmentVars} defined`}
              icon={Icon.Document}
            />
            <List.Item
              title="Sourced Files"
              subtitle={`${metrics.sourcedFiles} files`}
              icon={Icon.Document}
            />
            <List.Item
              title="Path Length"
              subtitle={`${metrics.pathLength} segments`}
              icon={Icon.Document}
            />
            <List.Item
              title="History Size"
              subtitle={`${metrics.historySize} bytes`}
              icon={Icon.Document}
            />
            <List.Item
              title="Completion Count"
              subtitle={`${metrics.completionCount} scripts`}
              icon={Icon.Document}
            />
          </>
        )}
      </List.Section>

      {suggestions.length > 0 && (
        <List.Section title="Optimization Suggestions">
          {suggestions.map((suggestion, index) => (
            <List.Item
              key={index}
              title={suggestion.title}
              subtitle={suggestion.description}
              icon={
                suggestion.severity === "high"
                  ? Icon.ExclamationMark
                  : suggestion.severity === "medium"
                  ? Icon.QuestionMark
                  : Icon.Checkmark
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Apply Optimization"
                    onAction={suggestion.action}
                    icon={Icon.Gear}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Actions">
        <List.Item
          title="Optimize Configuration"
          subtitle="Improve shell startup time"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action
                title="Optimize Shell"
                onAction={optimizeConfiguration}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {plugins.length > 0 && (
        <List.Section title="Installed Plugins">
          {plugins.map((plugin, index) => (
            <List.Item
              key={index}
              title={plugin.name}
              icon={
                plugin.impact === "high"
                  ? Icon.ExclamationMark
                  : plugin.impact === "medium"
                  ? Icon.QuestionMark
                  : Icon.Checkmark
              }
              accessories={[{ text: `Impact: ${plugin.impact}` }]}
            />
          ))}
        </List.Section>
      )}

      {backups.length > 0 && (
        <List.Section title="Backups">
          {backups.map((backup, index) => (
            <List.Item
              key={index}
              title={`Backup ${backup.date.toLocaleDateString()}`}
              subtitle={`Size: ${(backup.size / 1024).toFixed(2)}KB`}
              icon={Icon.Document}
              actions={
                <ActionPanel>
                  <Action
                    title="Restore Backup"
                    onAction={() => restoreBackup(backup)}
                    icon={Icon.ArrowClockwise}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
