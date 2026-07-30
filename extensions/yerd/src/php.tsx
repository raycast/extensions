import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { phpLabel } from "./helpers/format";
import { TIMEOUTS, runYerd } from "./yerd/cli";
import type {
  PhpAvailableResponse,
  PhpFpmStatus,
  PhpVersionsResponse,
  StatusResponse,
  ToolsResponse,
  YerdTool,
} from "./yerd/types";

/** Minors that require `--legacy` to install (out of upstream support). */
const LEGACY_VERSIONS = ["7.4", "8.0", "8.1"];

function isLegacy(version: string): boolean {
  return LEGACY_VERSIONS.includes(version);
}

/** Numeric x.y comparison so "8.10" sorts above "8.9". */
function compareVersions(a: string, b: string): number {
  const [amaj = 0, amin = 0] = a.split(".").map(Number);
  const [bmaj = 0, bmin = 0] = b.split(".").map(Number);
  return amaj - bmaj || amin - bmin;
}

function userMessageOf(err: unknown): string | undefined {
  if (err && typeof err === "object" && "userMessage" in err) {
    const m = (err as { userMessage: unknown }).userMessage;
    if (typeof m === "string") return m;
  }
  return undefined;
}

async function reportFailure(err: unknown, fallback: string): Promise<void> {
  await showFailureToast(err, { title: userMessageOf(err) ?? fallback });
}

/**
 * `yerd --json php ext list` — NOTE: takes NO version argument (verified via
 * `yerd php ext list --help`); the response groups extensions by version.
 * Element shape unverified (observed empty only) — consumed defensively.
 */
interface PhpExtensionsResponse {
  type: "php_extensions";
  by_version: Record<string, unknown[]>;
}

function extensionNameOf(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const o = entry as Record<string, unknown>;
    if (typeof o.name === "string") return o.name;
    if (typeof o.path === "string") return o.path;
  }
  return String(entry);
}

export default function Php() {
  const php = useCachedPromise(() =>
    runYerd<PhpVersionsResponse>(["list", "php"]),
  );
  const available = useCachedPromise(() =>
    runYerd<PhpAvailableResponse>(["list", "php", "--available"]),
  );
  const tools = useCachedPromise(() => runYerd<ToolsResponse>(["tools"]));
  // installed_patch / state / update_available live only in status.report.php —
  // `list php` returns bare version strings.
  const status = useCachedPromise(() => runYerd<StatusResponse>(["status"]));

  const revalidate = () => {
    php.revalidate();
    available.revalidate();
    tools.revalidate();
    status.revalidate();
  };

  const defaultVersion = php.data?.default;
  const settings = php.data?.settings ?? {};
  const fpmByVersion = new Map<string, PhpFpmStatus>(
    (status.data?.report.php ?? []).map((p) => [p.version, p]),
  );

  const installed = [...(php.data?.installed ?? [])].sort((a, b) =>
    compareVersions(b, a),
  );
  // Legacy minors are NOT in `available` — merge both arrays so they can be installed.
  const alreadyInstalled = new Set([
    ...(php.data?.installed ?? []),
    ...(available.data?.installed ?? []),
  ]);
  const installable = [
    ...new Set([
      ...(available.data?.available ?? []),
      ...(available.data?.legacy ?? []),
    ]),
  ]
    .filter((v) => !alreadyInstalled.has(v))
    .sort((a, b) => compareVersions(b, a));

  return (
    <List
      isLoading={
        php.isLoading ||
        available.isLoading ||
        tools.isLoading ||
        status.isLoading
      }
    >
      <List.Section title="Installed PHP">
        {installed.map((version) => (
          <InstalledPhpItem
            key={version}
            version={version}
            isDefault={version === defaultVersion}
            fpm={fpmByVersion.get(version)}
            settings={settings}
            revalidate={revalidate}
          />
        ))}
      </List.Section>
      <List.Section title="Available to Install">
        {installable.map((version) => (
          <AvailablePhpItem
            key={version}
            version={version}
            revalidate={revalidate}
          />
        ))}
      </List.Section>
      <List.Section title="Dev Tools">
        {(tools.data?.tools ?? []).map((tool) => (
          <ToolItem key={tool.id} tool={tool} revalidate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function InstalledPhpItem(props: {
  version: string;
  isDefault: boolean;
  fpm: PhpFpmStatus | undefined;
  settings: Record<string, string>;
  revalidate: () => void;
}) {
  const { version, isDefault, fpm, settings, revalidate } = props;

  const accessories: List.Item.Accessory[] = [];
  if (isDefault)
    accessories.push({ tag: { value: "Default", color: Color.Green } });
  if (fpm) {
    accessories.push({
      tag: {
        value: fpm.state,
        color: fpm.state === "running" ? Color.Green : Color.SecondaryText,
      },
    });
  }
  if (fpm?.update_available) {
    accessories.push({
      tag: { value: "Update available", color: Color.Orange },
      tooltip: `New patch: ${fpm.update_available}`,
    });
  }

  async function setDefault() {
    try {
      await runYerd(["use", version], { timeoutMs: TIMEOUTS.mutate });
      await showToast({
        style: Toast.Style.Success,
        title: `PHP ${version} is now the global default`,
      });
      revalidate();
    } catch (err) {
      await reportFailure(err, "Failed to set default PHP");
    }
  }

  async function restartFpm() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Restarting PHP ${version} FPM…`,
    });
    try {
      await runYerd(["restart", "php", version], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `PHP ${version} FPM restarted`;
      revalidate();
    } catch (err) {
      await reportFailure(err, "Failed to restart FPM");
    }
  }

  async function update() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating PHP ${version}…`,
    });
    try {
      await runYerd(["update", "php", version], {
        timeoutMs: TIMEOUTS.install,
      });
      toast.style = Toast.Style.Success;
      toast.title = `PHP ${version} updated`;
      revalidate();
    } catch (err) {
      await reportFailure(err, "Failed to update PHP");
    }
  }

  async function uninstall() {
    // Guard: never uninstall the default version (action is also hidden below).
    if (isDefault) return;
    const confirmed = await confirmAlert({
      title: `Uninstall PHP ${version}?`,
      message:
        "Removes this version's files. Yerd blocks the removal if a site still uses it.",
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await runYerd(["uninstall", "php", version], {
        timeoutMs: TIMEOUTS.mutate,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `PHP ${version} uninstalled`,
      });
      revalidate();
    } catch (err) {
      await reportFailure(err, "Failed to uninstall PHP");
    }
  }

  return (
    <List.Item
      title={fpm ? phpLabel(version, fpm.installed_patch) : version}
      accessories={accessories}
      actions={
        <ActionPanel>
          {!isDefault && (
            <Action
              title="Set as Global Default"
              icon={Icon.Star}
              onAction={setDefault}
            />
          )}
          <Action
            title="Restart FPM"
            icon={Icon.ArrowClockwise}
            onAction={restartFpm}
          />
          <Action.Push
            title="View PHP Settings"
            icon={Icon.Gear}
            target={<PhpSettingsView settings={settings} />}
          />
          <Action.Push
            title="Extensions"
            icon={Icon.Plug}
            target={<PhpExtensionsView version={version} />}
          />
          {fpm?.update_available != null && (
            <Action
              title={`Update PHP ${version}`}
              icon={Icon.Download}
              onAction={update}
            />
          )}
          {!isDefault && (
            <Action
              title={`Uninstall PHP ${version}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={uninstall}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function AvailablePhpItem({
  version,
  revalidate,
}: {
  version: string;
  revalidate: () => void;
}) {
  const legacy = isLegacy(version);

  async function install() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing PHP ${version}…`,
    });
    try {
      await runYerd(
        ["install", "php", version, ...(legacy ? ["--legacy"] : [])],
        { timeoutMs: TIMEOUTS.install },
      );
      toast.style = Toast.Style.Success;
      toast.title = `PHP ${version} installed`;
      revalidate();
    } catch (err) {
      await reportFailure(err, "Failed to install PHP");
    }
  }

  return (
    <List.Item
      title={version}
      accessories={
        legacy
          ? [
              {
                tag: { value: "Legacy", color: Color.Orange },
                tooltip: "Out of support — installed with --legacy",
              },
            ]
          : []
      }
      actions={
        <ActionPanel>
          <Action
            title={`Install PHP ${version}`}
            icon={Icon.Download}
            onAction={install}
          />
        </ActionPanel>
      }
    />
  );
}

function ToolItem({
  tool,
  revalidate,
}: {
  tool: YerdTool;
  revalidate: () => void;
}) {
  const subtitle = tool.installed
    ? tool.version && tool.version !== "installed"
      ? tool.version
      : "Installed"
    : "Not installed";

  async function install() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${tool.display_name}…`,
    });
    try {
      await runYerd(["install", "tool", tool.id], {
        timeoutMs: TIMEOUTS.install,
      });
      toast.style = Toast.Style.Success;
      toast.title = `${tool.display_name} installed`;
      revalidate();
    } catch (err) {
      await reportFailure(err, `Failed to install ${tool.display_name}`);
    }
  }

  async function uninstall() {
    const confirmed = await confirmAlert({
      title: `Uninstall ${tool.display_name}?`,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await runYerd(["uninstall", "tool", tool.id], {
        timeoutMs: TIMEOUTS.mutate,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `${tool.display_name} uninstalled`,
      });
      revalidate();
    } catch (err) {
      await reportFailure(err, `Failed to uninstall ${tool.display_name}`);
    }
  }

  return (
    <List.Item
      title={tool.display_name}
      subtitle={subtitle}
      accessories={
        tool.binaries.length > 0 ? [{ text: tool.binaries.join(", ") }] : []
      }
      actions={
        <ActionPanel>
          {!tool.installed && (
            <Action
              title="Install Tool"
              icon={Icon.Download}
              onAction={install}
            />
          )}
          {tool.installed && (
            <Action
              title="Uninstall Tool"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={uninstall}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function PhpSettingsView({ settings }: { settings: Record<string, string> }) {
  return (
    <List
      navigationTitle="PHP Settings"
      searchBarPlaceholder="Filter settings…"
    >
      {Object.entries(settings).map(([key, value]) => (
        <List.Item
          key={key}
          title={key}
          accessories={[{ text: value }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Setting"
                content={`${key} = ${value}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PhpExtensionsView({ version }: { version: string }) {
  const { data, isLoading, revalidate } = useCachedPromise(() =>
    runYerd<PhpExtensionsResponse>(["php", "ext", "list"]),
  );
  const entries = data?.by_version?.[version] ?? [];

  async function remove(name: string) {
    const confirmed = await confirmAlert({
      title: `Remove extension "${name}"?`,
      message: `Unregisters it from PHP ${version} (FPM and CLI).`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await runYerd(["php", "ext", "remove", version, name], {
        timeoutMs: TIMEOUTS.mutate,
      });
      await showToast({ style: Toast.Style.Success, title: `Removed ${name}` });
      revalidate();
    } catch (err) {
      await reportFailure(err, "Failed to remove extension");
    }
  }

  const addAction = (
    <Action.Push
      title="Add Extension"
      icon={Icon.Plus}
      target={<AddExtensionForm version={version} onAdded={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={`PHP ${version} Extensions`}>
      <List.EmptyView
        title="No custom extensions"
        description={`No custom extensions registered for PHP ${version}.`}
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {entries.map((entry, index) => {
        const name = extensionNameOf(entry);
        return (
          <List.Item
            key={`${name}-${index}`}
            title={name}
            actions={
              <ActionPanel>
                {addAction}
                <Action
                  title="Remove Extension"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => remove(name)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function AddExtensionForm({
  version,
  onAdded,
}: {
  version: string;
  onAdded: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: { so: string[]; name: string; zend: boolean }) {
    const path = values.so[0];
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a .so file",
      });
      return;
    }
    const args = ["php", "ext", "add", version, path];
    if (values.zend) args.push("--zend");
    const name = values.name.trim();
    if (name) args.push("--name", name);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding extension…",
    });
    try {
      await runYerd(args, { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = "Extension added";
      onAdded();
      pop();
    } catch (err) {
      await reportFailure(err, "Failed to add extension");
    }
  }

  return (
    <Form
      navigationTitle={`Add Extension to PHP ${version}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Extension"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="so"
        title="Extension (.so)"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Defaults to the .so file name"
      />
      <Form.Checkbox
        id="zend"
        label="Load as Zend extension (xdebug / opcache style)"
        defaultValue={false}
      />
    </Form>
  );
}
