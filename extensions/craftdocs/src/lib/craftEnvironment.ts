import type { Application } from "@raycast/api";
import path from "path";
import { homedir } from "os";
import { existsSync } from "fs";

export const supportedCraftBundleIds = ["com.lukilabs.lukiapp", "com.lukilabs.lukiapp-setapp"] as const;

export type SupportedCraftBundleId = (typeof supportedCraftBundleIds)[number];

export type CraftPreference = Application | string | null | undefined;

export type PreferredApplicationSelection =
  | { kind: "none" }
  | { kind: "bundleId"; value: string }
  | { kind: "path"; value: string }
  | { kind: "name"; value: string };

export type CraftEnvironmentResult =
  | { status: "missing-app" }
  | {
      status: "invalid-selection";
      selection: string;
      reason: "not-installed" | "unsupported-application";
    }
  | {
      status: "missing-data-root";
      application: Application;
      bundleId: SupportedCraftBundleId;
      dataRoot: string;
      searchPath: string;
      legacySettingsPath: string;
      settingsPath: string;
    }
  | {
      status: "missing-search-index";
      application: Application;
      bundleId: SupportedCraftBundleId;
      dataRoot: string;
      searchPath: string;
      legacySettingsPath: string;
      settingsPath: string;
    }
  | {
      status: "ready";
      application: Application;
      bundleId: SupportedCraftBundleId;
      dataRoot: string;
      searchPath: string;
      legacySettingsPath: string;
      settingsPath: string;
    };

type ResolveCraftEnvironmentParams = {
  installedApplications: Application[];
  preferredApplication: CraftPreference;
  supportPath: string;
  homeDirectory: string;
  fileExists: (targetPath: string) => boolean;
};

const settingsFileName = "space-settings.json";

export const isSupportedCraftBundleId = (value: string | undefined): value is SupportedCraftBundleId => {
  return value !== undefined && supportedCraftBundleIds.includes(value as SupportedCraftBundleId);
};

export const normalizePreferredApplication = (preference: CraftPreference): PreferredApplicationSelection => {
  if (!preference) {
    return { kind: "none" };
  }

  if (typeof preference === "string") {
    return normalizePreferredApplicationString(preference);
  }

  if (isNonEmptyString(preference.bundleId)) {
    return { kind: "bundleId", value: preference.bundleId };
  }

  if (isNonEmptyString(preference.path)) {
    return { kind: "path", value: preference.path };
  }

  if (isNonEmptyString(preference.name)) {
    return { kind: "name", value: preference.name };
  }

  return { kind: "none" };
};

export const resolveCraftEnvironment = ({
  installedApplications,
  preferredApplication,
  supportPath,
  homeDirectory,
  fileExists,
}: ResolveCraftEnvironmentParams): CraftEnvironmentResult => {
  const selection = normalizePreferredApplication(preferredApplication);
  const installedCraftApplications = getInstalledCraftApplications(installedApplications);
  const selectedApplication = resolveSelectedApplication(installedApplications, installedCraftApplications, selection);

  if (selectedApplication.status === "missing-app") {
    return selectedApplication;
  }

  if (selectedApplication.status === "invalid-selection") {
    return selectedApplication;
  }

  const { application } = selectedApplication;
  const bundleId = application.bundleId as SupportedCraftBundleId;
  const { dataRoot, searchPath, legacySettingsPath, settingsPath } = buildCraftPaths({
    bundleId,
    homeDirectory,
    supportPath,
  });

  if (!fileExists(dataRoot)) {
    return {
      status: "missing-data-root",
      application,
      bundleId,
      dataRoot,
      searchPath,
      legacySettingsPath,
      settingsPath,
    };
  }

  if (!fileExists(searchPath)) {
    return {
      status: "missing-search-index",
      application,
      bundleId,
      dataRoot,
      searchPath,
      legacySettingsPath,
      settingsPath,
    };
  }

  return {
    status: "ready",
    application,
    bundleId,
    dataRoot,
    searchPath,
    legacySettingsPath,
    settingsPath,
  };
};

export const buildCraftPaths = ({
  bundleId,
  homeDirectory,
  supportPath,
}: {
  bundleId: SupportedCraftBundleId;
  homeDirectory: string;
  supportPath: string;
}) => {
  const dataRoot = path.join(
    homeDirectory,
    "Library",
    "Containers",
    bundleId,
    "Data",
    "Library",
    "Application Support",
    bundleId,
  );

  return {
    dataRoot,
    searchPath: path.join(dataRoot, "Search"),
    legacySettingsPath: path.join(dataRoot, "raycast-spaces-config.json"),
    settingsPath: path.join(supportPath, settingsFileName),
  };
};

export const getCraftEnvironment = async (
  preferredApplication: CraftPreference,
  deps: Pick<ResolveCraftEnvironmentParams, "fileExists"> = { fileExists: defaultFileExists },
): Promise<CraftEnvironmentResult> => {
  const { environment, getApplications } = await import("@raycast/api");

  return resolveCraftEnvironment({
    installedApplications: await getApplications(),
    preferredApplication,
    supportPath: environment.supportPath,
    homeDirectory: homedir(),
    fileExists: deps.fileExists,
  });
};

const defaultFileExists = (targetPath: string) => {
  return existsSync(targetPath);
};

const getInstalledCraftApplications = (applications: Application[]) => {
  const craftApplications = applications.filter((application) => isSupportedCraftBundleId(application.bundleId));

  return supportedCraftBundleIds.flatMap((bundleId) =>
    craftApplications.filter((application) => application.bundleId === bundleId),
  );
};

const resolveSelectedApplication = (
  installedApplications: Application[],
  installedCraftApplications: Application[],
  selection: PreferredApplicationSelection,
):
  | { status: "missing-app" }
  | {
      status: "invalid-selection";
      selection: string;
      reason: "not-installed" | "unsupported-application";
    }
  | { status: "selected"; application: Application } => {
  if (selection.kind === "none") {
    const [application] = installedCraftApplications;

    return application ? { status: "selected", application } : { status: "missing-app" };
  }

  if (selection.kind === "bundleId") {
    if (!isSupportedCraftBundleId(selection.value)) {
      return {
        status: "invalid-selection",
        selection: selection.value,
        reason: "unsupported-application",
      };
    }

    const application = installedCraftApplications.find((item) => item.bundleId === selection.value);

    return application
      ? { status: "selected", application }
      : { status: "invalid-selection", selection: selection.value, reason: "not-installed" };
  }

  const application = installedCraftApplications.find((item) =>
    selection.kind === "path" ? item.path === selection.value : item.name === selection.value,
  );

  if (application) {
    return { status: "selected", application };
  }

  const unsupportedMatch = installedApplications.find((item) =>
    selection.kind === "path" ? item.path === selection.value : item.name === selection.value,
  );

  return {
    status: "invalid-selection",
    selection: selection.value,
    reason: unsupportedMatch ? "unsupported-application" : "not-installed",
  };
};

const normalizePreferredApplicationString = (value: string): PreferredApplicationSelection => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { kind: "none" };
  }

  if (trimmedValue.includes("/")) {
    return { kind: "path", value: trimmedValue };
  }

  if (trimmedValue.includes(".")) {
    return { kind: "bundleId", value: trimmedValue };
  }

  return { kind: "name", value: trimmedValue };
};

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
