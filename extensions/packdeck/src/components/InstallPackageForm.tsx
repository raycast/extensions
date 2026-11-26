import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ExtensionPreferences, InstallDependencyType, LocalProject, PackageManagerName } from "../types";
import { PACKAGE_MANAGER_META } from "../lib/constants";
import { formatDuration, formatPathForDisplay } from "../lib/format";
import { notifyOperationResult } from "../lib/notifications";
import { buildInstallCommand, executeInstall, isValidPackageName, isValidVersionSpec } from "../lib/package-manager";
import { fetchAbbreviatedMeta } from "../lib/registry";
import { useProjects } from "../lib/useProjects";

interface InstallPackageFormProps {
  packageName?: string;
  initialVersion?: string;
  defaultProject?: LocalProject;
  defaultGlobal?: boolean;
  defaultDepType?: InstallDependencyType;
  onSuccess?: () => unknown;
}

const GLOBAL_TARGET = "__global__";

export function InstallPackageForm({
  packageName: initialPkgName = "",
  initialVersion = "latest",
  defaultProject,
  defaultGlobal = false,
  defaultDepType = "prod",
  onSuccess,
}: InstallPackageFormProps) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const { projects, activeProject, isLoading: loadingProjects } = useProjects();

  const [pkgName, setPkgName] = useState(initialPkgName);
  const [target, setTarget] = useState<string>(
    defaultGlobal ? GLOBAL_TARGET : (defaultProject?.path ?? activeProject?.path ?? GLOBAL_TARGET),
  );
  const [pmOverride, setPmOverride] = useState<"auto" | PackageManagerName>("auto");
  const [depType, setDepType] = useState<InstallDependencyType>(defaultDepType);
  const [selectedVersion, setSelectedVersion] = useState<string>(initialVersion);
  const [customVersion, setCustomVersion] = useState<string>("");
  const [exact, setExact] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pkgNameError, setPkgNameError] = useState<string | undefined>();
  const [customVersionError, setCustomVersionError] = useState<string | undefined>();

  const effectiveTarget = useMemo(() => {
    if (target === GLOBAL_TARGET) return GLOBAL_TARGET;
    if (projects.some((p) => p.path === target)) return target;
    return defaultProject?.path ?? activeProject?.path ?? GLOBAL_TARGET;
  }, [target, projects, defaultProject, activeProject]);

  const selectedProject = useMemo(
    () => (effectiveTarget === GLOBAL_TARGET ? undefined : projects.find((p) => p.path === effectiveTarget)),
    [effectiveTarget, projects],
  );

  const isGlobal = effectiveTarget === GLOBAL_TARGET;

  const effectivePm: PackageManagerName = useMemo(() => {
    if (pmOverride !== "auto") return pmOverride;
    if (selectedProject) return selectedProject.packageManager;
    if (prefs.defaultPackageManager && prefs.defaultPackageManager !== "auto") {
      return prefs.defaultPackageManager;
    }
    return "npm";
  }, [pmOverride, selectedProject, prefs.defaultPackageManager]);

  const { data: meta, isLoading: loadingVersions } = usePromise(
    async (name: string) => {
      const cleaned = name.trim();
      if (!cleaned || cleaned.includes(" ")) return null;
      return fetchAbbreviatedMeta(cleaned, prefs.registryUrl);
    },
    [pkgName],
  );

  const effectiveVersion = customVersion.trim() || selectedVersion;
  const specPreview = useMemo(() => {
    const cleanName = pkgName.trim() || "<package>";
    const spec = effectiveVersion && effectiveVersion !== "latest" ? `${cleanName}@${effectiveVersion}` : cleanName;
    return buildInstallCommand(effectivePm, spec, { isGlobal, depType, exact }).display;
  }, [pkgName, effectiveVersion, effectivePm, isGlobal, depType, exact]);

  async function handleSubmit() {
    const cleanName = pkgName.trim();
    if (!cleanName) {
      setPkgNameError("Package name is required");
      return;
    }
    if (!isValidPackageName(cleanName)) {
      setPkgNameError("Enter a valid npm package name (e.g. zod or @scope/pkg)");
      return;
    }
    if (customVersion.trim() && !isValidVersionSpec(customVersion.trim())) {
      setCustomVersionError("Enter a valid version or semver range");
      return;
    }
    if (!isGlobal && !selectedProject) {
      await showToast({ style: Toast.Style.Failure, title: "Select a project or choose Global install" });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${cleanName}...`,
      message: specPreview,
    });

    const outcome = await executeInstall({
      pm: effectivePm,
      packageName: cleanName,
      version: effectiveVersion,
      projectPath: selectedProject?.path,
      projectName: selectedProject?.name,
      isGlobal,
      depType,
      exact,
      additionalPath: prefs.additionalPath,
    });

    setIsSubmitting(false);
    await toast.hide();

    await notifyOperationResult({
      title: outcome.success ? `Installed ${cleanName}` : `Failed to install ${cleanName}`,
      message: outcome.success
        ? `${isGlobal ? "Global" : selectedProject?.name} (${effectivePm}) · ${formatDuration(outcome.durationMs)}`
        : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) {
      await onSuccess?.();
      pop();
    }
  }

  const versionOptions = useMemo(() => {
    const opts: Array<{ value: string; title: string }> = [
      { value: "latest", title: meta?.latest ? `latest (${meta.latest})` : "latest" },
    ];
    if (meta) {
      for (const [tag, ver] of Object.entries(meta.distTags)) {
        if (tag === "latest") continue;
        opts.push({ value: tag, title: `${tag} (${ver})` });
      }
      for (const ver of meta.versions.slice(0, 30)) {
        opts.push({ value: ver, title: ver });
      }
    } else if (initialVersion && initialVersion !== "latest") {
      opts.push({ value: initialVersion, title: initialVersion });
    }
    return opts;
  }, [meta, initialVersion]);

  return (
    <Form
      isLoading={loadingProjects || loadingVersions || isSubmitting}
      navigationTitle={pkgName ? `Install ${pkgName}` : "Install Package"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Package" icon={Icon.Download} onSubmit={handleSubmit} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={specPreview}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="packageName"
        title="Package Name"
        placeholder="e.g. zod, @tanstack/react-query, typescript"
        value={pkgName}
        error={pkgNameError}
        onChange={(value) => {
          setPkgNameError(undefined);
          setPkgName(value);
        }}
        onBlur={(event) => {
          const v = event.target.value?.trim() ?? "";
          if (!v) setPkgNameError("Package name is required");
          else if (!isValidPackageName(v)) setPkgNameError("Enter a valid npm package name");
        }}
      />

      <Form.Dropdown id="target" title="Install Target" value={effectiveTarget} onChange={setTarget}>
        <Form.Dropdown.Section title="Global">
          <Form.Dropdown.Item value={GLOBAL_TARGET} title="Global (-g)" icon={Icon.Globe} />
        </Form.Dropdown.Section>
        {projects.length > 0 && (
          <Form.Dropdown.Section title="Local Projects">
            {projects.map((proj) => (
              <Form.Dropdown.Item
                key={proj.path}
                value={proj.path}
                title={`${proj.name} (${PACKAGE_MANAGER_META[proj.packageManager].label})`}
                icon={proj.path === activeProject?.path ? Icon.Star : Icon.Folder}
              />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>

      {selectedProject && <Form.Description title="Project Path" text={formatPathForDisplay(selectedProject.path)} />}

      {!isGlobal && (
        <Form.Dropdown
          id="depType"
          title="Dependency Type"
          value={depType}
          onChange={(v) => setDepType(v as InstallDependencyType)}
        >
          <Form.Dropdown.Item value="prod" title="Production (dependencies)" icon={Icon.Box} />
          <Form.Dropdown.Item value="dev" title="Development (devDependencies)" icon={Icon.Hammer} />
          <Form.Dropdown.Item value="optional" title="Optional (optionalDependencies)" icon={Icon.PlusCircle} />
          <Form.Dropdown.Item value="peer" title="Peer (peerDependencies)" icon={Icon.Link} />
        </Form.Dropdown>
      )}

      <Form.Dropdown id="version" title="Version / Tag" value={selectedVersion} onChange={setSelectedVersion}>
        {versionOptions.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="customVersion"
        title="Custom Version / Range"
        placeholder="Optional override (e.g. 2.1.0, ^3.0.0, beta)"
        value={customVersion}
        error={customVersionError}
        onChange={(value) => {
          setCustomVersionError(undefined);
          setCustomVersion(value);
        }}
        onBlur={(event) => {
          const v = event.target.value?.trim() ?? "";
          if (v && !isValidVersionSpec(v)) setCustomVersionError("Enter a valid version or semver range");
        }}
      />

      <Form.Dropdown
        id="packageManager"
        title="Package Manager"
        value={pmOverride}
        onChange={(v) => setPmOverride(v as "auto" | PackageManagerName)}
      >
        <Form.Dropdown.Item
          value="auto"
          title={`Auto (${PACKAGE_MANAGER_META[effectivePm].label}${selectedProject?.lockfileName ? ` via ${selectedProject.lockfileName}` : ""})`}
          icon={Icon.Wand}
        />
        <Form.Dropdown.Item value="npm" title="npm" />
        <Form.Dropdown.Item value="pnpm" title="pnpm" />
        <Form.Dropdown.Item value="yarn" title="Yarn" />
        <Form.Dropdown.Item value="bun" title="Bun" />
      </Form.Dropdown>

      {!isGlobal && (
        <Form.Checkbox id="exact" label="Pin exact version (--save-exact / -E)" value={exact} onChange={setExact} />
      )}

      <Form.Separator />
      <Form.Description title="Command Preview" text={specPreview} />
    </Form>
  );
}
