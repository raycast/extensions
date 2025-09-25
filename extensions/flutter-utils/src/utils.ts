import { getPreferenceValues, getSelectedFinderItems, showHUD, Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { stat } from "node:fs/promises";
import path from "node:path";

/**
 * Préférences globales de l'extension.
 * projectPath: chemin du projet Flutter par défaut.
 */
export type ExtensionPreferences = {
  /** Chemin absolu d'un projet Flutter à utiliser par défaut. */
  projectPath?: string;
  /** Chemin absolu du Flutter SDK (racine, contenant le dossier bin). */
  flutterSdkPath?: string;
};

/**
 * Retourne le chemin de projet Flutter à utiliser.
 * Ordre de résolution:
 * 1. Préférence `projectPath` si valide
 * 2. Élément sélectionné dans Finder (dossier ou fichier à l'intérieur du projet)
 *
 * Lève une erreur si aucun chemin valide n'est trouvé.
 */
export async function resolveProjectPath(): Promise<string> {
  const { projectPath } = getPreferenceValues<ExtensionPreferences>();

  if (projectPath) {
    const valid = await isExistingPath(projectPath);
    if (valid) {
      const baseDir = await ensureDirectoryPath(projectPath);
      const root = await findFlutterProjectRoot(baseDir);
      if (root) return root;
      throw new Error(
        "pubspec.yaml introuvable sous le chemin configuré. Sélectionnez un dossier projet Flutter ou mettez à jour 'Project Path'.",
      );
    }
  }

  try {
    const items = await getSelectedFinderItems();
    const first = items?.[0];
    if (first?.path) {
      const basePath = await ensureDirectoryPath(first.path);
      const root = await findFlutterProjectRoot(basePath);
      if (root) return root;
      throw new Error(
        "pubspec.yaml introuvable. Sélectionnez un dossier à l'intérieur d'un projet Flutter (contenant pubspec.yaml).",
      );
    }
  } catch {
    // ignore, on gèrera l'erreur plus bas
  }

  throw new Error(
    "Aucun chemin de projet trouvé. Renseignez la préférence 'Project Path' ou sélectionnez un dossier dans le Finder.",
  );
}

/**
 * Vérifie l'existence d'un chemin.
 */
export async function isExistingPath(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retourne un chemin dossier valide. Si `p` est un fichier, retourne son dossier parent.
 */
async function ensureDirectoryPath(p: string): Promise<string> {
  try {
    const info = await stat(p);
    if (info.isDirectory()) return p;
  } catch {
    // tombe au retour du parent
  }
  return path.dirname(p);
}

/**
 * Exécute une commande shell dans un répertoire donné.
 * Retourne stdout/stderr. Lève une erreur en cas d'échec.
 */
// Plus d'exécution background: tout passe par Warp

/**
 * Ouvre Terminal.app et exécute une commande dans un nouvel onglet.
 * Utilisé pour les commandes interactives comme `flutter run`.
 */
/**
 * Lance une commande interactive dans un terminal graphique.
 * Tente d'abord Warp, puis effectue un repli automatique vers Terminal.app en cas d'échec.
 * Retourne le terminal effectivement utilisé.
 */
export type TerminalOpenResult = { terminal: "warp" } | { terminal: "terminal" };
export async function runInTerminal(command: string, cwd: string): Promise<TerminalOpenResult> {
  try {
    await runInWarp(command, cwd);
    return { terminal: "warp" };
  } catch {
    // Fallback Terminal.app
    try {
      await runInMacTerminal(command, cwd);
      return { terminal: "terminal" };
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      await showErrorToast("Échec d'ouverture du terminal", message);
      throw err;
    }
  }
}

/**
 * Ouvre Warp et exécute une commande dans un nouvel onglet via System Events.
 * Nécessite l'accès Accessibilité pour Raycast.
 */
/**
 * Ouvre Warp et exécute une commande dans un nouvel onglet.
 * Implémentation volontairement simple (équivalente à la commande qui fonctionne chez l'utilisateur):
 *  - activate Warp
 *  - Cmd+N
 *  - taper "cd <cwd> && <command>" puis Enter
 * Laisse l'erreur remonter afin que l'appelant gère l'affichage.
 */
export async function runInWarp(command: string, cwd: string): Promise<void> {
  // Prépare la commande avec saut de ligne pour exécution immédiate au collage
  const line = `cd "${cwd.replace(/"/g, '\\"')}" && ${command}`;
  // Préparer le presse‑papiers via l'API Raycast (évite les échappements AppleScript)
  await Clipboard.copy(line);
  // Ouvre l'interface graphique de Warp de manière robuste (sans délais):
  // 1) open -a Warp (via do shell script)  2) activate  3) forcer fenêtre avec 2x Cmd+N
  const script = `
    try
      do shell script "open -a Warp"
    end try
    tell application "Warp" to activate
    tell application "System Events"
      repeat until (exists process "Warp")
        delay 0.1
      end repeat
      tell process "Warp"
        set frontmost to true

        -- 3) (optionnel) attendre qu'une fenêtre soit prête
        repeat until (exists window 1)
          delay 0.1
        end repeat

        -- 4) Nouvel onglet
        keystroke "n" using {command down}
        delay 0.1

        -- 5) Coller (⌘V)
        keystroke "v" using {command down}
      end tell
    end tell
  `;
  try {
    await runAppleScript(script);
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e);
    throw new Error(`Warp opening failed: ${message}`);
  }
}

/**
 * Ouvre Terminal.app et exécute la commande dans un nouvel onglet/fenêtre.
 */
async function runInMacTerminal(command: string, cwd: string): Promise<void> {
  const script = `
    tell application "Terminal"
      activate
      do script "cd " & quote & "${escapeForAppleScript(cwd)}" & quote & " && ${escapeForAppleScript(command)}"
    end tell
  `;
  await runAppleScript(script);
}

/**
 * Affiche un toast d'erreur standardisé.
 */
export async function showErrorToast(title: string, message?: string): Promise<void> {
  await showHUD(`${title}${message ? `: ${message}` : ""}`);
}

/**
 * Affiche un HUD de succès standardisé.
 */
export async function showSuccessHUD(message: string): Promise<void> {
  await showHUD(message);
}

/**
 * Échappe les caractères spéciaux pour AppleScript.
 */
function escapeForAppleScript(input: string): string {
  return input.replace(/"/g, '\\"');
}

/**
 * Construit la commande `flutter` à exécuter.
 * Si `Flutter SDK Path` est défini, utilise "<sdk>/bin/flutter".
 * Sinon, utilise le binaire dans le PATH ("flutter").
 */
export function buildFlutterCommand(subcommandAndArgs: string): string {
  const { flutterSdkPath } = getPreferenceValues<ExtensionPreferences>();
  const trimmed = subcommandAndArgs.trim();
  if (flutterSdkPath && flutterSdkPath.length > 0) {
    const bin = `${flutterSdkPath.replace(/\/$/, "")}/bin/flutter`;
    const quotedBin = `"${bin.replace(/"/g, '\\"')}"`;
    return `${quotedBin} ${trimmed}`.trim();
  }
  return `flutter ${trimmed}`.trim();
}

/**
 * Construit la commande flutter à exécuter en utilisant le SDK spécifié si présent.
 * Exemple: buildFlutterCommand("run -d ios") → "flutter run -d ios" ou "/path/sdk/bin/flutter run -d ios".
 */
// Construction de commande déléguée aux appels (on passe la chaîne complète)

/**
 * Variante asynchrone qui vérifie l'existence du binaire SDK.
 * Si le binaire n'existe pas, on retombe sur `flutter` du PATH.
 */
// Plus de build de commande avancée (SDK): on utilise "flutter ..." directement

/**
 * Construit les variables d'environnement d'exécution, en préfixant PATH avec le SDK Flutter si fourni.
 */
// Plus d'environnement personnalisé: Warp utilise l'environnement du shell

/**
 * Retourne true si les logs verbeux sont activés via préférences.
 */
// Suppression du logger verbeux pour simplifier

/**
 * Remonte les dossiers depuis `startDir` pour trouver un `pubspec.yaml`.
 * Retourne le dossier racine du projet Flutter si trouvé, sinon undefined.
 */
async function findFlutterProjectRoot(startDir: string): Promise<string | undefined> {
  let current: string | undefined = startDir;
  while (current && current !== path.dirname(current)) {
    const pubspecPath = path.join(current, "pubspec.yaml");
    if (await isExistingPath(pubspecPath)) return current;
    current = path.dirname(current);
  }
  return undefined;
}
