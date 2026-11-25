import { Clipboard, environment, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { constants } from "node:fs";
import { copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";

const selectedMailScript = `
ObjC.import("Foundation");

function run(argv) {
  const mail = Application("com.apple.mail");
  if (!mail.running()) throw new Error("Open Apple Mail and select an email first.");

  const selection = mail.selection();
  if (selection.length === 0) throw new Error("Select an email in Apple Mail first.");

  const message = selection[0];
  const source = message.source();
  if (!source) throw new Error("The selected email has no downloaded source. Download it in Mail first.");

  // Mail exposes raw message bytes as Latin-1 text, including UTF-8 body bytes.
  let encoding = $.NSISOLatin1StringEncoding;
  for (let index = 0; index < source.length; index++) {
    if (source.charCodeAt(index) > 255) {
      encoding = $.NSUTF8StringEncoding;
      break;
    }
  }
  const data = $(source).dataUsingEncoding(encoding);
  if (!data.writeToFileAtomically(argv[0], true)) throw new Error("The email source could not be saved.");

  return message.subject() || "Email";
}
`;

function getExportName(subject: string): string {
  return (
    Array.from(
      subject
        .replace(/[/\\:\p{Cc}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
      .slice(0, 50)
      .join("")
      .replace(/^\.+|\.+$/g, "") || "Email"
  );
}

async function saveExport(sourcePath: string, subject: string): Promise<string> {
  const { saveDirectory } = getPreferenceValues<Preferences>();
  const directory = (saveDirectory || "~/Downloads").replace(/^~(?=\/|$)/, homedir());
  await mkdir(directory, { recursive: true });
  const name = getExportName(subject);

  for (let suffix = 0; ; suffix++) {
    const path = join(directory, `${name}${suffix ? ` (${suffix})` : ""}.eml`);
    try {
      await copyFile(sourcePath, path, constants.COPYFILE_EXCL);
      return path;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

async function removeLegacyTemporaryExports(): Promise<void> {
  const entries = await readdir(tmpdir(), { withFileTypes: true });
  const directories = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      (entry.name === "raycast-mail-export" || /^raycast-mail-export-[A-Za-z0-9]{6}$/.test(entry.name)),
  );
  await Promise.all(directories.map((entry) => rm(join(tmpdir(), entry.name), { recursive: true, force: true })));
}

async function replaceClipboardExport(sourcePath: string, subject: string): Promise<string> {
  const directory = dirname(sourcePath);
  const filename = `${getExportName(subject)}.eml`.normalize("NFC");
  const path = join(directory, filename);
  await rename(sourcePath, path);

  const entries = await readdir(directory, { withFileTypes: true });
  const previousExports = entries.filter(
    (entry) => entry.isFile() && /\.eml$/i.test(entry.name) && entry.name.normalize("NFC") !== filename,
  );
  await Promise.all(previousExports.map((entry) => rm(join(directory, entry.name), { force: true })));
  return path;
}

export async function saveSelectedMail(onProgress: (message: string) => void): Promise<string | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving the selected email" });
  const directory = join(environment.supportPath, "clipboard");
  const stagingPath = join(directory, ".message-export");
  let savedPath: string | undefined;
  let stage = "reading the selected email";
  const updateStage = (description: string) => {
    stage = description;
    const message = `The command is ${description}.`;
    onProgress(message);
    toast.title = message;
  };

  try {
    const { saveExportedEmails = true } = getPreferenceValues<Preferences.SaveMailAsFile>();
    await mkdir(directory, { recursive: true, mode: 0o700 });
    updateStage("reading the selected email");
    const subject = await runAppleScript(selectedMailScript, [stagingPath], { language: "JavaScript", timeout: 15000 });
    updateStage("preparing the subject-named file");
    const exportPath = await replaceClipboardExport(stagingPath, subject);
    let clipboardPath = exportPath;
    if (saveExportedEmails) {
      updateStage("saving the exported file");
      savedPath = await saveExport(exportPath, subject);
      clipboardPath = savedPath;
    }
    updateStage("copying the exported file to the clipboard");
    await Clipboard.copy({ file: clipboardPath });
    await removeLegacyTemporaryExports().catch(() => {
      console.warn("Some temporary email export folders from an older version could not be removed.");
    });
    await toast.hide();
    await showHUD(
      saveExportedEmails ? "The EML file was saved and copied" : "The EML file was copied to the clipboard",
    );
  } catch (error) {
    const stderr = (error as { stderr?: unknown } | null)?.stderr;
    const details =
      typeof stderr === "string" && stderr.trim() ? stderr : error instanceof Error ? error.message : String(error);
    const report = `The EML export failed while ${stage}.\n${details}${
      savedPath ? `\nThe file was saved to ${savedPath}.` : ""
    }`;
    console.error(report);
    await toast.hide();
    return report;
  } finally {
    await rm(stagingPath, { force: true }).catch(() => undefined);
  }
}
