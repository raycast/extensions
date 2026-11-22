import { getPreferenceValues } from "@raycast/api";
import { resolveOrcaPath } from "./orca-cli";

type ExtensionPreferences = { orcaPath?: string; defaultBot?: string };

/** Chemin de la CLI Orca : la préférence `orcaPath` si renseignée, sinon le binaire embarqué dans Orca.app. */
export function getOrcaPath(): string {
  return resolveOrcaPath(getPreferenceValues<ExtensionPreferences>().orcaPath);
}

/** Dossier du bot par défaut choisi dans les préférences, ou undefined s'il n'est pas renseigné. */
export function getDefaultBotFolder(): string | undefined {
  const folder = getPreferenceValues<ExtensionPreferences>().defaultBot?.trim();
  return folder ? folder : undefined;
}
