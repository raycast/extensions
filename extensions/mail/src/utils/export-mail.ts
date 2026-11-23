import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

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

export async function saveSelectedMail(onProgress: (message: string) => void): Promise<string | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving the selected email" });
  let directory: string | undefined;
  let savedPath: string | undefined;
  let keepTemporaryFile = false;
  let stage = "reading the selected email";
  const updateStage = (description: string) => {
    stage = description;
    const message = `The command is ${description}.`;
    onProgress(message);
    toast.title = message;
  };

  try {
    const { saveExportedEmails = true } = getPreferenceValues<Preferences.SaveMailAsFile>();
    directory = await mkdtemp(join(tmpdir(), "raycast-mail-export-"));
    updateStage("reading the selected email");
    const exportPath = join(directory, "message.eml");
    const subject = await runAppleScript(selectedMailScript, [exportPath], { language: "JavaScript", timeout: 15000 });
    let clipboardPath: string;
    if (saveExportedEmails) {
      updateStage("saving the exported file");
      savedPath = await saveExport(exportPath, subject);
      clipboardPath = savedPath;
    } else {
      clipboardPath = join(directory, `${getExportName(subject)}.eml`);
      await rename(exportPath, clipboardPath);
    }
    updateStage("copying the exported file to the clipboard");
    await Clipboard.copy({ file: clipboardPath });
    // The clipboard holds a file reference, so its temporary target must remain available for pasting.
    keepTemporaryFile = !saveExportedEmails;
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
    if (directory && !keepTemporaryFile) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
