// Shared by the results view and the edit form: the editable state, and saving,
// exporting and copying it.
import {
  Clipboard,
  LaunchType,
  LocalStorage,
  PopToRootType,
  Toast,
  closeMainWindow,
  launchCommand,
  open,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { existsSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ContactsAccessError,
  saveContact,
  vcard,
  type NativeDraft,
} from "../native";
import { log } from "./log";
import type { ContactDraft } from "./parse";

export const PRIVACY_CONTACTS =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts";
export const CACHE_ACCOUNTS = "accounts";
export const LAST_ACCOUNT = "lastAccountId";

export type FormState = {
  draft: ContactDraft;
  emails: string;
  urls: string;
  note: string;
  accountId: string;
};

export type LaunchContext = {
  text?: string;
  /** A captured screenshot or card photo, shown beside the results. */
  image?: string;
  source?: "selection" | "screenshot" | "clipboard" | "retry";
  /** Set when a save failed after the window closed: reopen the form with the user's edits intact. */
  restore?: FormState;
  error?: string;
};

export const EMPTY_DRAFT: ContactDraft = {
  namePrefix: "",
  givenName: "",
  familyName: "",
  nameSuffix: "",
  organization: "",
  jobTitle: "",
  emails: [],
  phones: [],
  urls: [],
  address: null,
};

export const PHONE_LABELS = [
  { value: "mobile", title: "Mobile" },
  { value: "work", title: "Work" },
  { value: "home", title: "Home" },
  { value: "fax", title: "Fax" },
];

export const phoneLabelTitle = (label: string) =>
  PHONE_LABELS.find((l) => l.value === label)?.title ?? "Phone";

export function stateFromDraft(draft: ContactDraft, accountId = ""): FormState {
  return {
    draft,
    emails: draft.emails.map((e) => e.value).join(", "),
    urls: draft.urls.map((u) => u.value).join(", "),
    note: "",
    accountId,
  };
}

const split = (s: string) =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function toNative(s: FormState): NativeDraft {
  return {
    ...s.draft,
    emails: split(s.emails).map((value) => ({ value, label: "work" })),
    phones: s.draft.phones.filter((p) => p.value.trim()),
    urls: split(s.urls).map((value) => ({
      value,
      label: /linkedin\.com/i.test(value) ? "linkedin" : "work",
    })),
    note: s.note.trim() || null,
  };
}

export const displayName = (d: ContactDraft) =>
  [d.givenName, d.familyName].filter(Boolean).join(" ") || d.organization;

export async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function showContactsAccessToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Raycast has no access to Contacts",
    message: "Allow it in System Settings → Privacy & Security → Contacts.",
    primaryAction: {
      title: "Open Privacy Settings",
      onAction: () => open(PRIVACY_CONTACTS),
    },
  });
}

/**
 * Saves to Contacts. Contacts can take several seconds (Exchange especially), so the window
 * closes first and a HUD reports the result. On failure the form reopens with every edit intact.
 */
export async function saveState(
  snapshot: FormState,
  mode: { openAfter?: boolean; updateId?: string },
  text: string,
): Promise<void> {
  const name = displayName(snapshot.draft);
  const phones = snapshot.draft.phones.filter((p) => p.value.trim());
  if (!name && !snapshot.emails.trim() && phones.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Add a name, company, email or phone number",
    });
    return;
  }
  // Saved before the account list loaded: use the account the user picked last time.
  const accountId =
    snapshot.accountId ||
    (await LocalStorage.getItem<string>(LAST_ACCOUNT)) ||
    "";
  // Immediate pop: reopening Raycast must not show this filled form again (double save).
  await closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
  try {
    if (accountId) await LocalStorage.setItem(LAST_ACCOUNT, accountId);
    const result = await saveContact(
      toNative(snapshot),
      accountId || null,
      mode.updateId ?? null,
    );
    if (mode.openAfter || mode.updateId)
      await open(`addressbook://${result.id}`);
    const verb = result.updated ? "Updated" : "Saved";
    await showHUD(
      `${verb} ${name || phones[0]?.value || "contact"}${result.noteDropped ? " (note not saved)" : ""}`,
    );
  } catch (err) {
    const isAccess = err instanceof ContactsAccessError;
    if (isAccess) await open(PRIVACY_CONTACTS);
    const error = isAccess
      ? "Raycast has no access to Contacts"
      : String(err).slice(0, 120);
    try {
      await launchCommand({
        name: "save-vcard",
        type: LaunchType.UserInitiated,
        context: {
          text,
          source: "retry",
          restore: snapshot,
          error,
        } satisfies LaunchContext,
      });
    } catch (relaunchErr) {
      log("save", "could not reopen form after failed save", relaunchErr);
      await showHUD(`Not saved: ${error}`);
    }
  }
}

/** Writes a .vcf to Downloads without overwriting: "Anna Huber.vcf", "Anna Huber 2.vcf", … */
export async function exportState(state: FormState): Promise<void> {
  try {
    const card = await vcard(toNative(state));
    const base = (displayName(state.draft) || "contact").replace(
      /[/\\:*?"<>|]/g,
      "-",
    );
    const dir = path.join(os.homedir(), "Downloads");
    let file = path.join(dir, `${base}.vcf`);
    for (let i = 2; existsSync(file); i++)
      file = path.join(dir, `${base} ${i}.vcf`);
    writeFileSync(file, card, { flag: "wx" });
    log("export", "exported .vcf");
    await showInFinder(file);
    await showHUD(`Saved ${path.basename(file)} to Downloads`);
  } catch (err) {
    log("export", "export failed", err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not write the .vcf file",
      message: String(err),
    });
  }
}

export async function copyState(state: FormState): Promise<void> {
  try {
    await Clipboard.copy(await vcard(toNative(state)));
    await showHUD("Copied contact card");
  } catch (err) {
    log("export", "copy failed", err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not create the vCard",
      message: String(err),
    });
  }
}
