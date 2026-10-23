import { FolnaroError, isFolnaroError, type PermissionSwitch } from "./errors";
import type { StringKey, Translate } from "./i18n";

export interface ErrorPresentation {
  title: string;
  message?: string;
  /** The extension cannot fix it; the person has to do something in Folnaro or the App Store. */
  needsUserAction: boolean;
  /** Offer the App Store page (Folnaro missing or outdated). */
  offerAppStore: boolean;
  /** Offer to open Folnaro (a switch to turn on, an unlock, an update to finish). */
  offerOpenFolnaro: boolean;
}

export function permissionLabel(permission: PermissionSwitch | undefined, t: Translate): string {
  return t(`permission.${permission ?? "read"}` as StringKey);
}

/**
 * Turns any error into a calm toast: a known cause and a next step. Tool errors without a known
 * cause show the helper's own message, which is already in the person's language.
 */
export function describeError(error: unknown, t: Translate): ErrorPresentation {
  const base = { needsUserAction: false, offerAppStore: false, offerOpenFolnaro: false };
  if (!isFolnaroError(error)) {
    return { ...base, title: t("error.tool.title"), message: error instanceof Error ? error.message : String(error) };
  }
  const folnaroError: FolnaroError = error;
  switch (folnaroError.kind) {
    case "appNotInstalled":
      return {
        ...base,
        title: t("error.appNotInstalled.title"),
        message: t("error.appNotInstalled.message"),
        needsUserAction: true,
        offerAppStore: true,
      };
    case "helperMissing":
      return {
        ...base,
        title: t("error.helperMissing.title"),
        message: t("error.helperMissing.message"),
        needsUserAction: true,
        offerAppStore: true,
      };
    case "helperExited":
      return {
        ...base,
        title: t("error.helperExited.title"),
        message: t("error.helperExited.message"),
        offerOpenFolnaro: true,
      };
    case "timeout":
      return { ...base, title: t("error.timeout.title"), message: t("error.timeout.message") };
    case "permissionDenied": {
      const permission = permissionLabel(folnaroError.permission, t);
      return {
        ...base,
        title: t("error.permission.title", { permission }),
        message: t("error.permission.message", { permission }),
        needsUserAction: true,
        offerOpenFolnaro: true,
      };
    }
    case "readOnlyMode":
      return {
        ...base,
        title: t("error.readOnly.title"),
        message: t("error.readOnly.message"),
        needsUserAction: true,
        offerOpenFolnaro: true,
      };
    case "timerRunning":
      return { ...base, title: t("error.timerRunning.title"), message: t("error.timerRunning.message") };
    case "timerNotRunning":
      return { ...base, title: t("error.timerNotRunning.title") };
    case "duplicateReceipt":
      return {
        ...base,
        title: t("error.duplicateReceipt.title"),
        message: t("error.duplicateReceipt.message"),
        offerOpenFolnaro: true,
      };
    case "protocol":
      return { ...base, title: t("error.protocol.title"), message: folnaroError.message };
    case "tool":
      return { ...base, title: t("error.tool.title"), message: folnaroError.message };
  }
}
