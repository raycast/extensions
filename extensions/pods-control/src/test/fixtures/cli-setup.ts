import type { CliSetup } from "../../setup/detection";

export function cliSetup(overrides: Partial<CliSetup> = {}): CliSetup {
  return {
    state: "install",
    cliPath: null,
    brewPath: "/opt/homebrew/bin/brew",
    brewCliPrefix: null,
    brewLinked: null,
    configuredCliPath: null,
    developerTools: "ready",
    installedVersion: null,
    latestVersion: null,
    latestSource: null,
    liveCheckFailed: false,
    installationMethod: null,
    versionStatus: "unknown",
    meetsMinimum: null,
    ...overrides,
  };
}

export function installedCliSetup(overrides: Partial<CliSetup> = {}): CliSetup {
  return cliSetup({
    state: "update",
    cliPath: "/opt/homebrew/bin/pods-control",
    brewCliPrefix: "/opt/homebrew/opt/pods-control",
    installedVersion: "0.5.0",
    latestVersion: "0.5.0",
    latestSource: "homebrew",
    liveCheckFailed: false,
    installationMethod: "homebrew",
    versionStatus: "up-to-date",
    meetsMinimum: true,
    ...overrides,
  });
}

export function outdatedCliSetup(overrides: Partial<CliSetup> = {}): CliSetup {
  return installedCliSetup({
    installedVersion: "0.3.0",
    versionStatus: "update-available",
    meetsMinimum: false,
    ...overrides,
  });
}
