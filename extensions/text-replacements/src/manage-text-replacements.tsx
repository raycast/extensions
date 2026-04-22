import {
  ActionPanel,
  Action,
  List,
  Form,
  Toast,
  showToast,
  Clipboard,
  showHUD,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFileSync } from "child_process";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { writeFileSync } from "fs";
import { useState, useEffect } from "react";

// MARK: - Types

interface Replacement {
  dbPK: number;
  phrase: string;
  replacement: string;
}

// MARK: - DB helpers

const DB_PATH = join(homedir(), "Library/KeyboardServices/TextReplacements.db");

function sqlEscape(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function dbQuery(statement: string): string {
  return execFileSync("/usr/bin/sqlite3", ["-separator", "\x1F", DB_PATH, statement], {
    encoding: "utf8",
    timeout: 5000,
  });
}

function loadReplacements(): Replacement[] {
  const output = dbQuery(
    `SELECT Z_PK, ZSHORTCUT, ZPHRASE FROM ZTEXTREPLACEMENTENTRY
     WHERE (ZWASDELETED = 0 OR ZWASDELETED IS NULL)
       AND ZSHORTCUT IS NOT NULL AND ZSHORTCUT != ''
     ORDER BY ZSHORTCUT ASC;`
  );
  return output
    .split("\n")
    .filter((line) => line.includes("\x1F"))
    .map((line) => {
      const parts = line.split("\x1F");
      return { dbPK: parseInt(parts[0]), phrase: parts[1], replacement: parts[2] ?? "" };
    });
}

function insertReplacement(phrase: string, replacement: string): void {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // CoreData timestamps are seconds since 2001-01-01, not Unix epoch
  const timestamp = Date.now() / 1000 - 978307200;

  // Compute and claim the next PK atomically inside a single transaction to
  // avoid a TOCTOU race if another process inserts concurrently.
  const script = `
BEGIN IMMEDIATE;
UPDATE Z_PRIMARYKEY SET Z_MAX = MAX(Z_MAX, (SELECT MAX(Z_PK) FROM ZTEXTREPLACEMENTENTRY)) + 1 WHERE Z_ENT = 1;
INSERT INTO ZTEXTREPLACEMENTENTRY
  (Z_PK, Z_ENT, Z_OPT, ZNEEDSSAVETOCLOUD, ZWASDELETED, ZTIMESTAMP, ZPHRASE, ZSHORTCUT, ZUNIQUENAME)
SELECT Z_MAX, 1, 1, 1, 0, ${timestamp}, ${sqlEscape(replacement)}, ${sqlEscape(phrase)}, ${sqlEscape(uniqueName)}
FROM Z_PRIMARYKEY WHERE Z_ENT = 1;
COMMIT;`;

  execFileSync("/usr/bin/sqlite3", [DB_PATH], { input: script, encoding: "utf8", timeout: 5000 });
}

function updateReplacement(dbPK: number, phrase: string, replacement: string): void {
  execFileSync("/usr/bin/sqlite3", [
    DB_PATH,
    `UPDATE ZTEXTREPLACEMENTENTRY SET ZSHORTCUT=${sqlEscape(phrase)}, ZPHRASE=${sqlEscape(replacement)}, Z_OPT=Z_OPT+1, ZNEEDSSAVETOCLOUD=1 WHERE Z_PK=${dbPK};`,
  ], { encoding: "utf8", timeout: 5000 });
}

function deleteReplacement(dbPK: number): void {
  execFileSync("/usr/bin/sqlite3", [
    DB_PATH,
    `UPDATE ZTEXTREPLACEMENTENTRY SET ZWASDELETED=1, ZNEEDSSAVETOCLOUD=1, Z_OPT=Z_OPT+1 WHERE Z_PK=${dbPK};`,
  ], { encoding: "utf8", timeout: 5000 });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function notifySystem(): void {
  const all = loadReplacements();
  const itemsXml = all
    .map(
      (r) =>
        `    <dict>\n      <key>replace</key><string>${escapeXml(r.phrase)}</string>\n      <key>with</key><string>${escapeXml(r.replacement)}</string>\n    </dict>`
    )
    .join("\n");

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSUserReplacementItems</key>
  <array>
${itemsXml}
  </array>
</dict>
</plist>`;

  const tmpFile = join(tmpdir(), "raycast_replacements.plist");
  writeFileSync(tmpFile, plist, "utf8");
  execFileSync("/usr/bin/defaults", ["import", "-g", tmpFile], { timeout: 5000 });

  // Flush the WAL so the keyboard services daemon picks up the changes
  try {
    execFileSync("/usr/bin/sqlite3", [DB_PATH, "PRAGMA wal_checkpoint(PASSIVE);"], { timeout: 3000 });
  } catch {
    // non-fatal
  }
}

// MARK: - Form

function ReplacementForm({ initial, onSave }: { initial?: Replacement; onSave: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { phrase: string; replacement: string }) {
    const phrase = values.phrase.trim();
    const replacement = values.replacement; // preserve intentional leading/trailing spaces
    if (!phrase) {
      await showToast({ style: Toast.Style.Failure, title: "Shortcut cannot be empty" });
      return;
    }
    try {
      if (initial) {
        updateReplacement(initial.dbPK, phrase, replacement);
      } else {
        insertReplacement(phrase, replacement);
      }
      notifySystem();
      onSave();
      pop();
      await showToast({ style: Toast.Style.Success, title: initial ? "Replacement updated" : "Replacement added" });
    } catch (error) {
      showFailureToast(error, { title: "Failed to save replacement" });
    }
  }

  return (
    <Form
      navigationTitle={initial ? "Edit Replacement" : "Add Replacement"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="phrase" title="Shortcut" placeholder="abbr" defaultValue={initial?.phrase} />
      <Form.TextField
        id="replacement"
        title="Expands To"
        placeholder="the full text"
        defaultValue={initial?.replacement}
      />
    </Form>
  );
}

// MARK: - Main list

export default function ManageTextReplacements() {
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function refresh() {
    try {
      setReplacements(loadReplacements());
    } catch (error) {
      showFailureToast(error, { title: "Failed to load replacements" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(item: Replacement) {
    const confirmed = await confirmAlert({
      title: `Delete "${item.phrase}"?`,
      message: "This will remove it from System Settings too.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      deleteReplacement(item.dbPK);
      notifySystem();
      refresh();
      await showToast({ style: Toast.Style.Success, title: `Deleted "${item.phrase}"` });
    } catch (error) {
      showFailureToast(error, { title: "Failed to delete replacement" });
    }
  }

  return (
    <List searchBarPlaceholder="Search shortcuts…" isLoading={isLoading}>
      <List.Section title="Replacements" subtitle={`${replacements.length}`}>
        {replacements.map((item) => (
          <List.Item
            key={item.dbPK}
            title={item.phrase}
            subtitle={item.replacement}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Expansion"
                    onAction={async () => {
                      await Clipboard.copy(item.replacement);
                      await showHUD(`Copied expansion for "${item.phrase}"`);
                    }}
                  />
                  <Action
                    title="Paste Expansion"
                    onAction={async () => {
                      await Clipboard.paste(item.replacement);
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<ReplacementForm initial={item} onSave={refresh} />}
                  />
                  <Action.Push
                    title="Add New"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<ReplacementForm onSave={refresh} />}
                  />
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(item)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
