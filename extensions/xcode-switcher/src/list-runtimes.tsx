import React from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { findXcodesPath } from "./utils/xcodes";
import { t } from "./utils/i18n";
import { execSync } from "child_process";

interface Runtime {
  name: string;
  identifier: string;
  platform: string;
  version: string;
  isInstalled: boolean;
}

function parseRuntimesOutput(output: string): Runtime[] {
  const lines = output.split("\n").filter((line) => line.trim());
  const runtimes: Runtime[] = [];

  lines.forEach((line) => {
    // Parse diferentes formatos possíveis do xcodes runtimes
    // iOS 17.0 (21A5326a) - Installed
    // watchOS 10.0 (21R5326a)
    const match = line.match(
      /^(\w+)\s+([\d.]+)\s+\(([^)]+)\)(\s+-\s+Installed)?/,
    );
    if (match) {
      runtimes.push({
        platform: match[1],
        version: match[2],
        identifier: match[3],
        name: `${match[1]} ${match[2]}`,
        isInstalled: !!match[4],
      });
    }
  });

  return runtimes;
}

export default function Command() {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [xcodesPath, setXcodesPath] = useState<string | null>(null);

  useEffect(() => {
    const path = findXcodesPath();
    setXcodesPath(path);

    if (!path) {
      setError(t("xcodes.notFound"));
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: t("xcodes.notFound"),
        message: t("xcodes.installMessage"),
      });
    } else {
      loadRuntimes(path);
    }
  }, []);

  const loadRuntimes = async (cmdPath: string) => {
    setIsLoading(true);
    try {
      const output = execSync(`${cmdPath} runtimes`, {
        encoding: "utf-8",
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      });

      const parsed = parseRuntimesOutput(output);
      setRuntimes(parsed);
    } catch (err: any) {
      // Tenta pegar stdout mesmo com erro
      if (err.stdout) {
        const parsed = parseRuntimesOutput(err.stdout);
        if (parsed.length > 0) {
          setRuntimes(parsed);
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message);
        showToast({
          style: Toast.Style.Failure,
          title: t("error"),
          message: err.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallRuntime = async (runtime: Runtime) => {
    if (!xcodesPath) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${runtime.name}...`,
    });

    try {
      execSync(`${xcodesPath} runtimes install "${runtime.identifier}"`, {
        encoding: "utf-8",
        timeout: 300000, // 5 minutos - runtimes podem ser grandes
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = `${runtime.name} installed successfully`;

      setTimeout(() => loadRuntimes(xcodesPath), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = t("error");
      toast.message = error.message;
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={t("error")}
          description={error}
        />
      </List>
    );
  }

  // Agrupa por plataforma
  const groupedRuntimes = runtimes.reduce(
    (acc, runtime) => {
      if (!acc[runtime.platform]) {
        acc[runtime.platform] = [];
      }
      acc[runtime.platform].push(runtime);
      return acc;
    },
    {} as Record<string, Runtime[]>,
  );

  return (
    <List isLoading={isLoading}>
      {Object.entries(groupedRuntimes).map(([platform, platformRuntimes]) => (
        <List.Section key={platform} title={platform}>
          {platformRuntimes.map((runtime, index) => (
            <List.Item
              key={`${platform}-${index}`}
              icon={{
                source: runtime.isInstalled ? Icon.CheckCircle : Icon.Circle,
                tintColor: runtime.isInstalled
                  ? Color.Green
                  : Color.SecondaryText,
              }}
              title={runtime.name}
              subtitle={runtime.identifier}
              accessories={[{ text: runtime.isInstalled ? "Installed" : "" }]}
              actions={
                <ActionPanel>
                  {!runtime.isInstalled && (
                    <Action
                      title={t("runtimes.install")}
                      icon={Icon.Download}
                      onAction={() => handleInstallRuntime(runtime)}
                    />
                  )}
                  <Action
                    title={t("reload")}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => xcodesPath && loadRuntimes(xcodesPath)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
