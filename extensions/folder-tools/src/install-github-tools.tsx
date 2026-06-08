import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import {
  ResultDetail,
  prefs,
  runCapture,
  runInTerminal,
  shellEscape,
} from "./lib";

type Values = {
  target: string;
  repo1: string;
  repo2: string;
  repo3: string;
  installCmd1?: string;
  installCmd2?: string;
  installCmd3?: string;
  mode: string;
  yes?: boolean;
  dryRun?: boolean;
  trustInstallScripts?: boolean;
};

function addIfPresent(args: string[], key: string, value?: string) {
  const clean = (value || "").trim();
  if (clean) args.push(key, clean);
}

function buildArgs(values: Values): string[] {
  const args: string[] = ["--target", values.target.trim()];
  args.push("--repo", values.repo1.trim());
  args.push("--repo", values.repo2.trim());
  args.push("--repo", values.repo3.trim());
  addIfPresent(args, "--install-cmd", values.installCmd1);
  addIfPresent(args, "--install-cmd", values.installCmd2);
  addIfPresent(args, "--install-cmd", values.installCmd3);
  if (values.yes) args.push("--yes");
  if (values.dryRun) args.push("--dry-run");
  if (values.trustInstallScripts) args.push("--trust-install-scripts");
  return args;
}

function commandLine(script: string, args: string[]): string {
  return [shellEscape(script), ...args.map(shellEscape)].join(" ");
}

export default function Command(props: { draftValues?: Values }) {
  const { push } = useNavigation();
  const p = prefs();
  const draft = props.draftValues;

  async function handleSubmit(values: Values) {
    if (
      !values.target.trim() ||
      !values.repo1.trim() ||
      !values.repo2.trim() ||
      !values.repo3.trim()
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Faltan target o repositorios",
      });
      return;
    }

    const args = buildArgs(values);
    const script = p.installToolsScript;

    if (values.mode === "terminal") {
      await runInTerminal(commandLine(script, args), values.target.trim());
      return;
    }

    const result = await runCapture(
      "install github tools",
      script,
      args,
      values.target.trim(),
    );
    push(<ResultDetail result={result} />);
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Instalar Herramientas"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Directorio"
        placeholder="/Users/dalonsogomez/Developer/mi-proyecto"
        defaultValue={draft?.target ?? p.defaultTarget}
      />
      <Form.Separator />
      <Form.TextField
        id="repo1"
        title="Repo 1"
        placeholder="owner/tool1 o https://github.com/owner/tool1"
        defaultValue={draft?.repo1}
      />
      <Form.TextField
        id="repo2"
        title="Repo 2"
        placeholder="owner/tool2"
        defaultValue={draft?.repo2}
      />
      <Form.TextField
        id="repo3"
        title="Repo 3"
        placeholder="owner/tool3#v1.2.0"
        defaultValue={draft?.repo3}
      />
      <Form.Separator />
      <Form.TextField
        id="installCmd1"
        title="Install Cmd 1"
        placeholder="opcional. Variables: TOOL_TARGET_DIR, TOOL_PREFIX, TOOL_BIN_DIR, TOOL_SOURCE_DIR"
        defaultValue={draft?.installCmd1}
      />
      <Form.TextField
        id="installCmd2"
        title="Install Cmd 2"
        placeholder="opcional"
        defaultValue={draft?.installCmd2}
      />
      <Form.TextField
        id="installCmd3"
        title="Install Cmd 3"
        placeholder="opcional"
        defaultValue={draft?.installCmd3}
      />
      <Form.Separator />
      <Form.Dropdown
        id="mode"
        title="Modo"
        defaultValue={draft?.mode ?? "terminal"}
      >
        <Form.Dropdown.Item
          value="terminal"
          title="Terminal: recomendado para git clone/install"
          icon={Icon.Terminal}
        />
        <Form.Dropdown.Item
          value="raycast"
          title="Raycast: capturar salida"
          icon={Icon.Window}
        />
      </Form.Dropdown>
      <Form.Checkbox
        id="yes"
        title="Opciones"
        label="--yes: no pedir confirmacion final"
        defaultValue={draft?.yes ?? true}
      />
      <Form.Checkbox
        id="dryRun"
        label="--dry-run: mostrar plan sin ejecutar"
        defaultValue={draft?.dryRun}
      />
      <Form.Checkbox
        id="trustInstallScripts"
        label="--trust-install-scripts: permitir install.sh o make install del repo"
        defaultValue={draft?.trustInstallScripts}
      />
    </Form>
  );
}
