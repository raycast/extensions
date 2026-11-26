import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { InstallDependencyType, LocalProject, PackageManagerName } from "../types";
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

interface InstallFormValues {
  packageName: string;
  target: string;
  depType: string;
  version: string;
  customVersion: string;
  packageManager: string;
  exact: boolean;
}

const GLOBAL_TARGET = "__global__";
const UNRESOLVED_TARGET = "";

export function InstallPackageForm({
  packageName: initialPkgName = "",
  initialVersion = "latest",
  defaultProject,
  defaultGlobal = false,
  defaultDepType = "prod",
  onSuccess,
}: InstallPackageFormProps) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const { projects, activeProject, isLoading: loadingProjects } = useProjects();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<InstallFormValues>({
    initialValues: {
      packageName: initialPkgName,
      target: defaultGlobal ? GLOBAL_TARGET : (defaultProject?.path ?? UNRESOLVED_TARGET),
      depType: defaultDepType,
      version: initialVersion,
      customVersion: "",
      packageManager: "auto",
      exact: false,
    },
    validation: {
      packageName: (value) => {
        const trimmed = value?.trim() ?? "";
        if (!trimmed) return "Package name is required";
        if (!isValidPackageName(trimmed)) return "Enter a valid npm package name (e.g. zod or @scope/pkg)";
      },
      customVersion: (value) => {
        const trimmed = value?.trim() ?? "";
        if (trimmed && !isValidVersionSpec(trimmed)) return "Enter a valid version or semver range";
      },
    },
    async onSubmit(formValues) {
      const cleanName = formValues.packageName.trim();
      const targetVal = resolveEffectiveTarget(formValues.target);
      const installGlobal = targetVal === GLOBAL_TARGET;
      const targetProject = installGlobal ? undefined : availableProjects.find((p) => p.path === targetVal);

      if (!installGlobal && !targetProject) {
        await showToast({ style: Toast.Style.Failure, title: "Select a project or choose Global install" });
        return;
      }

      const pm = resolveEffectivePm(formValues.packageManager as "auto" | PackageManagerName, targetProject);
      const version = formValues.customVersion.trim() || formValues.version;
      const depType = formValues.depType as InstallDependencyType;
      const spec = version && version !== "latest" ? `${cleanName}@${version}` : cleanName;
      const cmdPreview = buildInstallCommand(pm, spec, {
        isGlobal: installGlobal,
        depType,
        exact: formValues.exact,
      }).display;

      setIsSubmitting(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Installing ${cleanName}...`,
        message: cmdPreview,
      });

      const outcome = await executeInstall({
        pm,
        packageName: cleanName,
        version,
        projectPath: targetProject?.path,
        projectName: targetProject?.name,
        isGlobal: installGlobal,
        depType,
        exact: formValues.exact,
        additionalPath: prefs.additionalPath,
      });

      setIsSubmitting(false);
      await toast.hide();

      await notifyOperationResult({
        title: outcome.success ? `Installed ${cleanName}` : `Failed to install ${cleanName}`,
        message: outcome.success
          ? `${installGlobal ? "Global" : targetProject?.name} (${pm}) · ${formatDuration(outcome.durationMs)}`
          : outcome.errorMessage,
        success: outcome.success,
        durationMs: outcome.durationMs,
      });

      if (outcome.success) {
        await onSuccess?.();
        pop();
      }
    },
  });

  const availableProjects = useMemo(() => {
    if (!defaultProject) return projects;
    if (projects.some((p) => p.path === defaultProject.path)) return projects;
    return [defaultProject, ...projects];
  }, [projects, defaultProject]);

  function resolveEffectiveTarget(currentTarget: string): string {
    if (currentTarget === GLOBAL_TARGET) return GLOBAL_TARGET;
    if (currentTarget && availableProjects.some((p) => p.path === currentTarget)) return currentTarget;
    if (defaultProject && availableProjects.some((p) => p.path === defaultProject.path)) return defaultProject.path;
    if (activeProject) return activeProject.path;
    return loadingProjects ? UNRESOLVED_TARGET : GLOBAL_TARGET;
  }

  function resolveEffectivePm(override: "auto" | PackageManagerName, proj?: LocalProject): PackageManagerName {
    if (override !== "auto") return override;
    if (proj) return proj.packageManager;
    if (prefs.defaultPackageManager && prefs.defaultPackageManager !== "auto") {
      return prefs.defaultPackageManager as PackageManagerName;
    }
    return "npm";
  }

  const effectiveTarget = resolveEffectiveTarget(values.target);
  const selectedProject = useMemo(
    () =>
      !effectiveTarget || effectiveTarget === GLOBAL_TARGET
        ? undefined
        : availableProjects.find((p) => p.path === effectiveTarget),
    [effectiveTarget, availableProjects],
  );
  const isGlobal = effectiveTarget === GLOBAL_TARGET;
  const effectivePm = resolveEffectivePm(values.packageManager as "auto" | PackageManagerName, selectedProject);

  const { data: meta, isLoading: loadingVersions } = usePromise(
    async (name: string) => {
      const cleaned = name.trim();
      if (!cleaned || !isValidPackageName(cleaned)) return null;
      return fetchAbbreviatedMeta(cleaned, prefs.registryUrl);
    },
    [values.packageName],
  );

  const effectiveVersion = values.customVersion.trim() || values.version;
  const specPreview = useMemo(() => {
    const cleanName = values.packageName.trim() || "<package>";
    const spec = effectiveVersion && effectiveVersion !== "latest" ? `${cleanName}@${effectiveVersion}` : cleanName;
    return buildInstallCommand(effectivePm, spec, {
      isGlobal,
      depType: values.depType as InstallDependencyType,
      exact: values.exact,
    }).display;
  }, [values.packageName, effectiveVersion, effectivePm, isGlobal, values.depType, values.exact]);

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
      navigationTitle={values.packageName ? `Install ${values.packageName}` : "Install Package"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Package" icon={Icon.Download} onSubmit={handleSubmit} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={specPreview}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Package Name"
        placeholder="e.g. zod, @tanstack/react-query, typescript"
        {...itemProps.packageName}
      />

      <Form.Dropdown
        id={itemProps.target.id}
        title="Install Target"
        value={effectiveTarget}
        onChange={(nextVal) => {
          if (nextVal !== UNRESOLVED_TARGET) {
            itemProps.target.onChange?.(nextVal);
          }
        }}
      >
        {effectiveTarget === UNRESOLVED_TARGET && (
          <Form.Dropdown.Item value={UNRESOLVED_TARGET} title="Loading local projects…" icon={Icon.Clock} />
        )}
        <Form.Dropdown.Section title="Global">
          <Form.Dropdown.Item value={GLOBAL_TARGET} title="Global (-g)" icon={Icon.Globe} />
        </Form.Dropdown.Section>
        {availableProjects.length > 0 && (
          <Form.Dropdown.Section title="Local Projects">
            {availableProjects.map((proj) => (
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
        <Form.Dropdown title="Dependency Type" {...itemProps.depType}>
          <Form.Dropdown.Item value="prod" title="Production (dependencies)" icon={Icon.Box} />
          <Form.Dropdown.Item value="dev" title="Development (devDependencies)" icon={Icon.Hammer} />
          <Form.Dropdown.Item value="optional" title="Optional (optionalDependencies)" icon={Icon.PlusCircle} />
          <Form.Dropdown.Item value="peer" title="Peer (peerDependencies)" icon={Icon.Link} />
        </Form.Dropdown>
      )}

      <Form.Dropdown title="Version / Tag" {...itemProps.version}>
        {versionOptions.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        title="Custom Version / Range"
        placeholder="Optional override (e.g. 2.1.0, ^3.0.0, beta)"
        {...itemProps.customVersion}
      />

      <Form.Dropdown title="Package Manager" {...itemProps.packageManager}>
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

      {!isGlobal && <Form.Checkbox label="Pin exact version (--save-exact / -E)" {...itemProps.exact} />}

      <Form.Separator />
      <Form.Description title="Command Preview" text={specPreview} />
    </Form>
  );
}
