import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, List, useNavigation, getPreferenceValues } from "@raycast/api";
import { resolveProjectPath, showErrorToast, buildFlutterCommand, runInWarp, showSuccessHUD } from "./utils";
import { spawn } from "node:child_process";

/**
 * Ensemble des clés d'action Flutter disponibles dans l'UI.
 */
type FlutterActionKey =
  | "run"
  | "pub-get"
  | "clean"
  | "analyze"
  | "test"
  | "build-apk"
  | "build-appbundle"
  | "build-ios"
  | "doctor";

type FlutterAction = {
  key: FlutterActionKey;
  title: string;
  subtitle: string;
  icon: Icon;
  /**
   * Détermine si l'action doit s'exécuter dans Terminal (interactif)
   * ou en tâche de fond (exec).
   */
  interactive: boolean;
  /**
   * Sous-commande flutter de base (ex: "run", "build apk", "analyze").
   */
  commandBase: string;
};

const ACTIONS: FlutterAction[] = [
  { key: "run", title: "Run", subtitle: "Lancer l'app", icon: Icon.Play, interactive: true, commandBase: "run" },
  {
    key: "pub-get",
    title: "Pub Get",
    subtitle: "Récupérer les dépendances",
    icon: Icon.ArrowDownCircle,
    interactive: false,
    commandBase: "pub get",
  },
  {
    key: "clean",
    title: "Clean",
    subtitle: "Nettoyer le build",
    icon: Icon.Trash,
    interactive: false,
    commandBase: "clean",
  },
  {
    key: "analyze",
    title: "Analyze",
    subtitle: "Analyser le code (linter)",
    icon: Icon.MagnifyingGlass,
    interactive: false,
    commandBase: "analyze",
  },
  {
    key: "test",
    title: "Test",
    subtitle: "Exécuter les tests",
    icon: Icon.Checkmark,
    interactive: false,
    commandBase: "test",
  },
  {
    key: "build-apk",
    title: "Build APK",
    subtitle: "Construire l'APK Android",
    icon: Icon.Gear,
    interactive: false,
    commandBase: "build apk",
  },
  {
    key: "build-appbundle",
    title: "Build AppBundle",
    subtitle: "Construire l'AAB Android",
    icon: Icon.Gear,
    interactive: false,
    commandBase: "build appbundle",
  },
  {
    key: "build-ios",
    title: "Build iOS",
    subtitle: "Construire l'app iOS",
    icon: Icon.Gear,
    interactive: false,
    commandBase: "build ios",
  },
  {
    key: "doctor",
    title: "Doctor",
    subtitle: "Diagnostiquer l'environnement",
    icon: Icon.Shield,
    interactive: false,
    commandBase: "doctor",
  },
];

/**
 * Écran principal listant les actions Flutter.
 * La sélection pousse un formulaire permettant d'ajouter des arguments.
 */
export default function CommandFlutter() {
  return (
    <List searchBarPlaceholder="Rechercher une action Flutter...">
      {ACTIONS.map((action) => (
        <List.Item
          key={action.key}
          title={action.title}
          subtitle={action.subtitle}
          icon={action.icon}
          actions={
            <ActionPanel>
              <Action.Push
                title="Ajouter Des Arguments"
                icon={Icon.Terminal}
                target={<ArgumentsForm action={action} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type ArgumentsFormValues = {
  args?: string;
  deviceId?: string;
};

/**
 * Formulaire permettant de saisir des arguments supplémentaires pour une action Flutter.
 */
/**
 * Représente un device Flutter (id lisible par `-d`, nom, plateforme).
 */
type DeviceItem = { id: string; name: string; platform: string };

/**
 * Formulaire de saisie d'arguments pour exécuter une action Flutter.
 * - Pour "run": propose la sélection du device et des arguments additionnels
 * - Pour les autres actions: propose des arguments additionnels libres
 */
function ArgumentsForm({ action }: { action: FlutterAction }) {
  const { push } = useNavigation();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    async function fetchDevices() {
      if (action.key !== "run") return;
      setLoadingDevices(true);
      try {
        const prefs = getPreferenceValues<{ flutterSdkPath?: string }>();
        const env = buildEnvWithSdk(prefs.flutterSdkPath);
        const child = spawn("flutter devices --machine", { shell: true, env });
        let out = "";
        child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
        child.stderr?.on("data", (d: Buffer) => (out += d.toString()));
        child.on("close", () => {
          try {
            // Nettoyage: extraire strictement le tableau JSON si des lignes parasites existent
            let jsonText = out.trim();
            const startIdx = jsonText.indexOf("[");
            const endIdx = jsonText.lastIndexOf("]");
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              jsonText = jsonText.slice(startIdx, endIdx + 1);
            }
            const arr = JSON.parse(jsonText) as Array<{ id: string; name: string; targetPlatform?: string }>;
            setDevices(arr.map((d) => ({ id: d.id, name: d.name, platform: d.targetPlatform ?? "" })));
          } catch {
            setDevices([]);
          } finally {
            setLoadingDevices(false);
          }
        });
      } catch {
        setDevices([]);
        setLoadingDevices(false);
      }
    }
    fetchDevices();
  }, [action.key]);
  const onSubmit = useCallback(
    async (values: ArgumentsFormValues) => {
      const extraArgs = (values.args ?? "").trim();
      try {
        const cwd = await resolveProjectPath();
        if (action.key === "run") {
          const deviceArg = values.deviceId && values.deviceId !== "auto" ? ` -d ${values.deviceId}` : "";
          const runArgs = `${deviceArg}${extraArgs.length > 0 ? ` ${extraArgs}` : ""}`;
          // Si plusieurs devices et aucun choisi, demander un choix
          if (devices.length > 1 && (!values.deviceId || values.deviceId === "auto")) {
            await showErrorToast("Plusieurs devices détectés", "Sélectionnez un device ou utilisez -d");
            return;
          }
          // Toujours ouvrir dans Warp (interactif)
          await runInWarp(buildFlutterCommand(`${action.commandBase}${runArgs}`), cwd);
          await showSuccessHUD("Ouvert dans Warp (interactif)");
          return;
        }

        const argsSuffix = extraArgs.length > 0 ? ` ${extraArgs}` : "";
        push(
          <ProgressView
            title={`flutter ${action.commandBase}`}
            command={buildFlutterCommand(`${action.commandBase}${argsSuffix}`)}
            cwd={cwd}
          />,
        );
      } catch (error) {
        await showErrorToast("Échec de l'exécution", String(error instanceof Error ? error.message : error));
      }
    },
    [action, devices.length],
  );

  return (
    <Form
      navigationTitle={`Flutter ${action.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Exécuter" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      {action.key === "run" && (
        <Form.Dropdown id="deviceId" title="Device" storeValue>
          <Form.Dropdown.Item
            value="auto"
            title={loadingDevices ? "Chargement..." : "Auto (laisser Flutter choisir)"}
          />
          <Form.Dropdown.Item value="all" title="Tous les devices (-d all)" />
          {devices.map((d) => (
            <Form.Dropdown.Item key={d.id} value={d.id} title={`${d.name}${d.platform ? ` (${d.platform})` : ""}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description
        text={
          action.key === "run"
            ? "Ajoutez des arguments supplémentaires pour la commande. Laissez vide si aucun."
            : "Vous pouvez fournir des arguments supplémentaires (optionnel)."
        }
      />
      <Form.TextField
        id="args"
        title="Arguments"
        placeholder={action.key === "run" ? "Ex: --flavor prod" : "Ex: --coverage, --release"}
      />
    </Form>
  );
}

type ProgressViewProps = {
  title: string;
  command: string;
  cwd: string;
};

/**
 * Statuts d'exécution d'un process externe.
 */
enum ExecutionStatus {
  pending = "pending",
  Running = "running",
  Success = "success",
  Error = "error",
}

/**
 * Vue de progression affichant l'exécution d'une commande avec logs live.
 */
function ProgressView({ title, command, cwd }: ProgressViewProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<ExecutionStatus>(ExecutionStatus.pending);
  const childRef = useRef<ReturnType<typeof spawn> | null>(null);
  const spawnErrorRef = useRef<string | null>(null);

  /**
   * Détermine si une ligne correspond à l'aide interactive standard affichée par `flutter run`.
   * Exemple de lignes masquées:
   *  - "Flutter run key commands."
   *  - "h List all available interactive commands."
   *  - "c Clear the screen"
   *  - "q Quit (terminate the application on the device)."
   * Ces lignes sont utiles en terminal interactif mais bruitent les logs UI.
   */
  function isFlutterRunInteractiveHelpLine(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (/^Flutter run key commands\.?$/i.test(trimmed)) return true;
    // Filtre ciblé sur les lignes évoquées (h/c/q). On pourra élargir si besoin.
    if (/^h\s+List all available interactive commands\.?/i.test(trimmed)) return true;
    if (/^c\s+Clear the screen/i.test(trimmed)) return true;
    if (/^q\s+Quit\b/i.test(trimmed)) return true;
    return false;
  }

  useEffect(() => {
    const prefs = getPreferenceValues<{ flutterSdkPath?: string }>();
    const env = buildEnvWithSdk(prefs.flutterSdkPath);
    const child = spawn(command, { cwd, shell: true, env });
    childRef.current = child;

    const handleData = (data: Buffer) => {
      setStatus(ExecutionStatus.pending);
      const text = data.toString();
      if (text.trim().length > 0 && status === ExecutionStatus.pending) {
        setStatus(ExecutionStatus.Running);
      }
      const incomingLines = text.split("\n");
      const visibleLines = incomingLines.filter((l) => !isFlutterRunInteractiveHelpLine(l));
      setLines((prev) => [...prev, ...visibleLines]);
    };

    const onStdout = handleData;
    const onStderr = handleData;
    const onError = (err: Error) => {
      // Ne pas afficher tout de suite; n'afficher que si le process échoue
      spawnErrorRef.current = err.message;
    };
    const onClose = () => {
      // no-op: la décision finale est prise sur 'exit'
      return;
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (code !== null) {
        setLines((prev) => [...prev, `Process exited with code ${code}`]);
      } else if (signal) {
        setLines((prev) => [...prev, `Process terminated by signal ${signal}`]);
      }
      if (code !== 0 && spawnErrorRef.current) {
        setLines((prev) => [...prev, `spawn error: ${spawnErrorRef.current}`]);
      }
      setStatus(code === 0 ? ExecutionStatus.Success : ExecutionStatus.Error);
    };

    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.on("error", onError);
    child.on("close", onClose);
    child.on("exit", onExit);

    return () => {
      try {
        child.stdout?.off("data", onStdout);
        child.stderr?.off("data", onStderr);
        child.off("error", onError);
        child.off("close", onClose);
        child.off("exit", onExit);
        // Si le process tourne encore (effet remonté ou fermeture de la vue), on le termine pour éviter les doublons
        if (child.exitCode === null) {
          try {
            child.kill();
          } catch {
            // ignore kill errors
          }
        }
      } finally {
        childRef.current = null;
      }
    };
  }, [command, cwd]);

  /**
   * Formate les lignes sous forme de diff pour bénéficier des couleurs natives de Raycast:
   *  - "+" vert pour les succès
   *  - "-" rouge pour les erreurs
   *  - les warnings sont préfixés par "⚠️ " (pas de couleur dédiée dans diff)
   *  - les étapes sont préfixées par "▶️ "
   */
  function formatLogLinesForDiff(sourceLines: string[]): string {
    const toDiff = (line: string): string => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return line;

      // Étapes / headings
      if (/^(Doctor summary|Running|Building|Resolving|Downloading|Analyzing|Test|Launching)/i.test(trimmed)) {
        return ` ${"▶️ "}${line}`;
      }
      // Attente
      if (/^Waiting for another flutter command/i.test(trimmed)) {
        return ` ${"⚠️ "}${line}`;
      }
      // Succès
      if (/^\[✓\]|(succeeded|success|All tests passed|Process exited with code 0)/i.test(trimmed)) {
        return `+ ${line}`;
      }
      // Warnings
      if (/(warning|WARN|not accepted|deprecated)/i.test(trimmed)) {
        return ` ${"⚠️ "}${line}`;
      }
      // Erreurs
      if (/^(\[✗|\[x\]|\[X\]|!|error|Error|ERROR)/.test(trimmed) || /Exception|Unhandled|Traceback/.test(trimmed)) {
        return `- ${line}`;
      }
      return ` ${line}`;
    };
    return sourceLines.map((l) => toDiff(l)).join("\n");
  }

  const markdown = useMemo(() => {
    const headerText =
      status === ExecutionStatus.pending
        ? "Préparation…"
        : status === ExecutionStatus.Running
          ? "Exécution en cours…"
          : status === ExecutionStatus.Success
            ? "Terminé avec succès ✅"
            : status === ExecutionStatus.Error
              ? "Erreur ❌"
              : "";
    const headerIcon =
      status === ExecutionStatus.pending
        ? "⏳"
        : status === ExecutionStatus.Running
          ? "🏃"
          : status === ExecutionStatus.Success
            ? "✅"
            : status === ExecutionStatus.Error
              ? "❌"
              : "";
    const header = `# ${headerIcon} ${title}\n\n${headerText}`;
    const bodyDiff = formatLogLinesForDiff(lines);
    const body = `\n\n\`\`\`diff\n${bodyDiff}\n\`\`\``; // code block diff
    return header + body;
  }, [title, status, lines]);

  return (
    <Detail isLoading={status === ExecutionStatus.pending || status === ExecutionStatus.Running} markdown={markdown} />
  );
}

/**
 * Construit un PATH avec le SDK Flutter si fourni pour les process spawnés.
 */
function buildEnvWithSdk(sdkPath?: string): NodeJS.ProcessEnv {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  const defaultPath = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  env.PATH = env.PATH ? `${env.PATH}:${defaultPath}` : defaultPath;
  if (sdkPath && sdkPath.length > 0) {
    const binDir = `${sdkPath.replace(/\/$/, "")}/bin`;
    env.PATH = `${binDir}:${env.PATH}`;
  }
  return env;
}
// AutoProgress conservé précédemment, supprimé car tous les flux passent par ArgumentsForm.
