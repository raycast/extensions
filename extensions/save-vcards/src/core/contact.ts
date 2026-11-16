// Shared by the results view and the edit form: the editable state, and saving,
// exporting and copying it.
import { Clipboard, LocalStorage, PopToRootType, Toast, open, showHUD, showInFinder, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ContactsAccessError, saveContact, vcard, type NativeDraft } from "../native";
import { log } from "./log";
import type { ContactDraft } from "./parse";

export const PRIVACY_CONTACTS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts";
// Stored JSON-encoded, the format useLocalStorage from @raycast/utils reads back.
// (The earlier key "lastAccountId" held a plain string and is ignored.)
export const LAST_ACCOUNT = "lastAccount";

async function readLastAccount(): Promise<string | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(LAST_ACCOUNT);
    const id = raw === undefined ? undefined : JSON.parse(raw);
    return typeof id === "string" ? id : undefined;
  } catch {
    return undefined;
  }
}

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
  source?: "selection" | "screenshot" | "clipboard";
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

export const phoneLabelTitle = (label: string) => PHONE_LABELS.find((l) => l.value === label)?.title ?? "Phone";

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

export const displayName = (d: ContactDraft) => [d.givenName, d.familyName].filter(Boolean).join(" ") || d.organization;

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
 * Saves to Contacts. The view stays open, with everything typed in it, until the save has
 * succeeded; only then does Raycast close with a confirmation.
 */
let saving = false;

export async function saveState(snapshot: FormState, mode: { openAfter?: boolean; updateId?: string }): Promise<void> {
  // ↵ pressed again while "Saving contact…" shows must not create a second contact.
  if (saving) return;
  saving = true;
  try {
    await save(snapshot, mode);
  } finally {
    saving = false;
  }
}

async function save(snapshot: FormState, mode: { openAfter?: boolean; updateId?: string }): Promise<void> {
  const native = toNative(snapshot);
  const name = displayName(snapshot.draft);
  if (!name && native.emails.length === 0 && native.phones.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Add a name, company, email or phone number" });
    return;
  }
  // Saved before the account list loaded: the account used last time, which the list would show.
  const accountId = snapshot.accountId || (await readLastAccount()) || "";
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: mode.updateId ? "Updating contact…" : "Saving contact…",
  });

  let result;
  try {
    result = await saveContact(native, accountId || null, mode.updateId ?? null);
  } catch (err) {
    await toast.hide();
    if (err instanceof ContactsAccessError) await showContactsAccessToast();
    else await showFailureToast(err, { title: "Contact not saved" });
    return;
  }

  // The contact is saved from here on. Nothing below may report it as unsaved.
  if (accountId) await LocalStorage.setItem(LAST_ACCOUNT, JSON.stringify(accountId));
  let openFailed = false;
  if (mode.openAfter || mode.updateId) {
    try {
      await open(`addressbook://${result.id}`);
    } catch (err) {
      openFailed = true;
      log("save", "saved, but could not open Contacts", err);
    }
  }
  const verb = result.updated ? "Updated" : "Saved";
  const who = name || native.phones[0]?.value || "contact";
  const notes = [result.noteDropped && "note not saved", openFailed && "could not open Contacts"].filter(Boolean);
  await showHUD(`${verb} ${who}${notes.length ? ` (${notes.join(", ")})` : ""}`, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}

/** Writes a .vcf to Downloads without overwriting: "Anna Huber.vcf", "Anna Huber 2.vcf", … */
export async function exportState(state: FormState): Promise<void> {
  try {
    const card = await vcard(toNative(state));
    const base = (displayName(state.draft) || "contact").replace(/[/\\:*?"<>|]/g, "-");
    const dir = path.join(os.homedir(), "Downloads");
    let file = path.join(dir, `${base}.vcf`);
    for (let i = 2; existsSync(file); i++) file = path.join(dir, `${base} ${i}.vcf`);
    writeFileSync(file, card, { flag: "wx" });
    log("export", "exported .vcf");
    await showInFinder(file);
    await showHUD(`Saved ${path.basename(file)} to Downloads`);
  } catch (err) {
    log("export", "export failed", err);
    await showFailureToast(err, { title: "Could not write the .vcf file" });
  }
}

export async function copyState(state: FormState): Promise<void> {
  try {
    await Clipboard.copy(await vcard(toNative(state)));
    await showHUD("Copied contact card");
  } catch (err) {
    log("export", "copy failed", err);
    await showFailureToast(err, { title: "Could not create the vCard" });
  }
}
