import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as fs from "fs";
import * as path from "path";
import { buildFilename, loadLists, Student, StudentList } from "./utils";
import { AddStudentForm } from "./manage-students";

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 – Pick folder, bezeichnung, and list
// ─────────────────────────────────────────────────────────────────────────────
export default function RenameFiles() {
  const { push } = useNavigation();
  const [lists, setLists] = useState<StudentList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [filesForRename, setFilesForRename] = useState<string[]>([]);
  const [bezeichnung, setBezeichnung] = useState("");
  const [folderError, setFolderError] = useState<string | undefined>();
  const [bezeichnungError, setBezeichnungError] = useState<
    string | undefined
  >();
  const [listError, setListError] = useState<string | undefined>();
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    loadLists().then((l) => {
      setLists(l);
      if (l.length === 1) setSelectedListId(l[0].id);
    });
  }, []);

  function validateSelection(paths: string[]) {
    setSelectedPaths(paths);
    setFolderError(undefined);
    setFolder("");
    setFilesForRename([]);
    setFileCount(0);
    if (paths.length === 0) return;

    const normalized = paths.map((p) =>
      p.replace(/^~/, process.env.HOME ?? ""),
    );
    const directories = normalized.filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
    const files = normalized.filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch {
        return false;
      }
    });

    if (directories.length > 0 && files.length > 0) {
      setFolderError("Bitte entweder nur Files oder genau einen Ordner wählen");
      return;
    }

    if (directories.length > 0) {
      if (directories.length !== 1) {
        setFolderError("Bitte genau einen Ordner auswählen");
        return;
      }
      const folderPath = directories[0];
      const numbered = getNumberedFiles(folderPath);
      if (numbered.length === 0) {
        setFolderError("Keine File1.pdf … FileX.pdf gefunden");
        return;
      }
      setFolder(folderPath);
      setFilesForRename(numbered);
      setFileCount(numbered.length);
      return;
    }

    const uniqueDirs = Array.from(new Set(files.map((f) => path.dirname(f))));
    if (uniqueDirs.length !== 1) {
      setFolderError("Bitte Files nur aus einem einzigen Ordner auswählen");
      return;
    }

    const numbered = files
      .map((f) => path.basename(f))
      .filter((f) => /^File\d+\./i.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
        const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
        return na - nb;
      });

    if (numbered.length === 0) {
      setFolderError("Keine gültigen File1.pdf … FileX.pdf in Auswahl");
      return;
    }

    setFolder(uniqueDirs[0]);
    setFilesForRename(numbered);
    setFileCount(numbered.length);
  }

  const selectedList = lists.find((l) => l.id === selectedListId);

  return (
    <Form
      navigationTitle="Files umbenennen – Schritt 1 von 3"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Weiter → Lernende Zuweisen (⌘↵)"
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={() => {
              let valid = true;
              if (!folder || folderError || filesForRename.length === 0) {
                setFolderError(
                  "Bitte gültige Files oder einen Ordner auswählen",
                );
                valid = false;
              }
              if (!bezeichnung.trim()) {
                setBezeichnungError("Pflichtfeld");
                valid = false;
              }
              if (!selectedListId) {
                setListError("Bitte eine Liste auswählen");
                valid = false;
              }
              if (!valid) return;
              push(
                <AssignStudents
                  folder={folder}
                  files={filesForRename}
                  bezeichnung={bezeichnung.trim()}
                  list={selectedList!}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Schritt 1 – Ordner, Liste & Bezeichnung"
        text="Wähle per Finder einen Ordner / Files. Danach Liste und Bezeichnung wählen."
      />

      <Form.FilePicker
        id="source"
        title="Files oder Ordner"
        value={selectedPaths}
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
        error={folderError}
        onChange={validateSelection}
        info="Drag & Drop möglich. Entweder genau 1 Ordner oder mehrere Files aus demselben Ordner."
      />
      {folder && <Form.Description title="Ordner" text={folder} />}
      {fileCount > 0 && (
        <Form.Description title="" text={`✓ ${fileCount} File(s) gefunden`} />
      )}

      <Form.Separator />

      <Form.Dropdown
        id="list"
        title="Liste"
        value={selectedListId}
        error={listError}
        onChange={(v) => {
          setSelectedListId(v);
          setListError(undefined);
        }}
        info="Verwalte Listen unter 'Listen verwalten'"
      >
        <Form.Dropdown.Item value="" title="– Liste auswählen –" />
        {lists.map((l) => (
          <Form.Dropdown.Item
            key={l.id}
            value={l.id}
            title={l.name}
            keywords={[l.name]}
          />
        ))}
      </Form.Dropdown>

      {selectedList && (
        <Form.Description
          title={`${selectedList.students.length} Lernende`}
          text={
            selectedList.students
              .slice(0, 8)
              .map((s, i) => `${i + 1}. ${s.firstName} ${s.lastName}`)
              .join("  ·  ") + (selectedList.students.length > 8 ? "  · …" : "")
          }
        />
      )}

      {lists.length === 0 && (
        <Form.Description
          title="⚠ Keine Listen"
          text="Erstelle zuerst eine Liste unter 'Listen verwalten'"
        />
      )}

      <Form.Separator />

      <Form.TextField
        id="bezeichnung"
        title="Bezeichnung"
        placeholder="Datei XY"
        value={bezeichnung}
        error={bezeichnungError}
        onChange={(v) => {
          setBezeichnung(v);
          setBezeichnungError(undefined);
        }}
        info="Wird Teil des Dateinamens: email%Bezeichnung.pdf"
      />
    </Form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 – Assign students to files (with add/remove)
// ─────────────────────────────────────────────────────────────────────────────
function AssignStudents({
  folder,
  files,
  bezeichnung,
  list,
}: {
  folder: string;
  files: string[];
  bezeichnung: string;
  list: StudentList;
}) {
  const { push, pop } = useNavigation();
  const [students, setStudents] = useState<Student[]>(list.students);
  const [assignments, setAssignments] = useState<Record<number, string>>(() => {
    const auto: Record<number, string> = {};
    files.forEach((_, i) => {
      if (list.students[i]) auto[i] = list.students[i].id;
    });
    return auto;
  });

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  async function addStudent(s: Student) {
    setStudents((prev) => [...prev, s]);
  }

  async function removeStudent(id: string) {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const ok = await confirmAlert({
      title: `${student.firstName} ${student.lastName} für diesen Lauf entfernen?`,
      message: "Die gespeicherte Liste bleibt unverändert.",
      primaryAction: {
        title: "Entfernen",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;

    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    const newAssign = { ...assignments };
    Object.keys(newAssign).forEach((k) => {
      if (newAssign[+k] === id) delete newAssign[+k];
    });
    setAssignments(newAssign);
  }

  return (
    <List
      navigationTitle={`Schritt 2 – Lernende zuweisen (${assignedCount}/${files.length})`}
      actions={
        <ActionPanel>
          <Action
            title="Weiter → Vorschau (⌘↵)"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() =>
              push(
                <PreviewAndRename
                  folder={folder}
                  files={files}
                  bezeichnung={bezeichnung}
                  students={students}
                  assignments={assignments}
                />,
              )
            }
          />
          <Action
            title="Manuelle Zuweisung (dropdown) (⌘e)"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() =>
              push(
                <ManualAssignmentsForm
                  files={files}
                  students={students}
                  assignments={assignments}
                  onSave={setAssignments}
                />,
              )
            }
          />
          <Action
            title="Lernenden Hinzufügen"
            icon={Icon.Plus}
            onAction={() => push(<AddStudentForm onAdd={addStudent} />)}
          />
          <Action title="Zurück" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    >
      <List.Section title="Shortcuts">
        <List.Item
          icon={Icon.Keyboard}
          title="⌘↵ Weiter · ⌘E Manuelle Zuweisung"
        />
      </List.Section>
      <List.Section
        title={`${files.length} Files – Zuweisung nur via Manuelle Zuweisung (⌘E)`}
      >
        {files.map((file, i) => {
          const assigned = students.find((s) => s.id === assignments[i]);
          return (
            <List.Item
              key={file}
              icon={
                assigned
                  ? { source: Icon.Checkmark, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={file}
              subtitle={
                assigned
                  ? `→ ${assigned.firstName} ${assigned.lastName}`
                  : "– nicht zugewiesen –"
              }
              accessories={
                assigned
                  ? [{ tag: { value: assigned.email, color: Color.Blue } }]
                  : [{ tag: { value: "leer", color: Color.Red } }]
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Manuelle Zuweisung (dropdown) (⌘e)"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() =>
                      push(
                        <ManualAssignmentsForm
                          files={files}
                          students={students}
                          assignments={assignments}
                          onSave={setAssignments}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Weiter → Vorschau (⌘↵)"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() =>
                      push(
                        <PreviewAndRename
                          folder={folder}
                          files={files}
                          bezeichnung={bezeichnung}
                          students={students}
                          assignments={assignments}
                        />,
                      )
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Lernende in dieser Liste">
        {students.map((s, i) => (
          <List.Item
            key={s.id}
            icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
            title={`${s.firstName} ${s.lastName}`}
            subtitle={s.email}
            accessories={[
              { tag: { value: `#${i + 1}`, color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Aus Liste Entfernen"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeStudent(s.id)}
                />
                <Action
                  title="Lernenden Hinzufügen"
                  icon={Icon.Plus}
                  onAction={() => push(<AddStudentForm onAdd={addStudent} />)}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={Icon.Plus}
          title="Lernenden hinzufügen"
          actions={
            <ActionPanel>
              <Action
                title="Hinzufügen"
                icon={Icon.Plus}
                onAction={() => push(<AddStudentForm onAdd={addStudent} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function ManualAssignmentsForm({
  files,
  students,
  assignments,
  onSave,
}: {
  files: string[];
  students: Student[];
  assignments: Record<number, string>;
  onSave: (next: Record<number, string>) => void;
}) {
  const { pop } = useNavigation();
  const [draft, setDraft] = useState<Record<number, string>>(() => ({
    ...assignments,
  }));

  return (
    <Form
      navigationTitle="Manuelle File-Zuweisung"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Zuweisungen Übernehmen"
            onSubmit={() => {
              const cleaned: Record<number, string> = {};
              Object.entries(draft).forEach(([k, v]) => {
                if (v) cleaned[Number(k)] = v;
              });
              onSave(cleaned);
              pop();
            }}
          />
          <Action title="Abbrechen" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Hinweis"
        text="Passe die Zuordnung pro Datei an. Leerer Eintrag bedeutet: Datei wird in Schritt 3 übersprungen."
      />
      {files.map((file, i) => (
        <Form.Dropdown
          key={file}
          id={`file-${i}`}
          title={`File${i + 1}`}
          value={draft[i] ?? ""}
          onChange={(value) => setDraft((prev) => ({ ...prev, [i]: value }))}
        >
          <Form.Dropdown.Item value="" title="– nicht zugewiesen –" />
          {students.map((s) => (
            <Form.Dropdown.Item
              key={s.id}
              value={s.id}
              title={`${s.firstName} ${s.lastName}`}
              keywords={[s.email, s.firstName, s.lastName]}
            />
          ))}
        </Form.Dropdown>
      ))}
    </Form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 – Preview & Rename
// ─────────────────────────────────────────────────────────────────────────────
function PreviewAndRename({
  folder,
  files,
  bezeichnung,
  students,
  assignments,
}: {
  folder: string;
  files: string[];
  bezeichnung: string;
  students: Student[];
  assignments: Record<number, string>;
}) {
  const { pop } = useNavigation();
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<
    { old: string; new: string; ok: boolean }[]
  >([]);

  const preview = files.map((file, i) => {
    const student = students.find((s) => s.id === assignments[i]);
    const ext = path.extname(file);
    const newName = student
      ? buildFilename(student.email, bezeichnung, ext)
      : null;
    return { file, student, newName };
  });

  const assignedCount = preview.filter((p) => p.newName).length;
  const skippedCount = preview.length - assignedCount;

  async function doRename() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Umbenennen …",
    });
    const res: { old: string; new: string; ok: boolean }[] = [];
    for (const p of preview) {
      if (!p.newName) continue;
      const oldPath = path.join(folder, p.file);
      const newPath = path.join(folder, p.newName);
      try {
        fs.renameSync(oldPath, newPath);
        res.push({ old: p.file, new: p.newName, ok: true });
      } catch (e) {
        res.push({ old: p.file, new: `Fehler: ${String(e)}`, ok: false });
      }
    }
    setResults(res);
    setDone(true);
    toast.hide();
    const okCount = res.filter((r) => r.ok).length;
    const errCount = res.filter((r) => !r.ok).length;
    if (errCount === 0)
      await showHUD(`✓ ${okCount} Files erfolgreich umbenannt`);
    else
      await showToast({
        style: Toast.Style.Failure,
        title: `${okCount} ok, ${errCount} Fehler`,
      });
  }

  if (done) {
    const okCount = results.filter((r) => r.ok).length;
    const errCount = results.filter((r) => !r.ok).length;
    const md = `# ✅ ${okCount} Files umbenannt${errCount > 0 ? ` · ⚠️ ${errCount} Fehler` : ""}\n\n${results.map((r) => (r.ok ? `**✓** ~~${r.old}~~ → \`${r.new}\`` : `**✗** ${r.old} → ${r.new}`)).join("\n\n")}${skippedCount > 0 ? `\n\n_${skippedCount} File(s) ohne Zuweisung wurden übersprungen._` : ""}`;
    return (
      <Detail
        navigationTitle="Fertig"
        markdown={md}
        actions={
          <ActionPanel>
            <Action.ShowInFinder
              path={folder}
              title="Ordner Im Finder Öffnen"
            />
          </ActionPanel>
        }
      />
    );
  }

  const md = `# Vorschau – ${assignedCount} Files werden umbenannt\n\n| Aktuell | Neu |\n|---|---|\n${preview
    .filter((p) => p.newName)
    .map((p) => `| \`${p.file}\` | \`${p.newName}\` |`)
    .join(
      "\n",
    )}${skippedCount > 0 ? `\n\n> ⚠️ **${skippedCount} File(s) ohne Zuweisung** werden übersprungen.` : ""}\n\n**Bezeichnung:** ${bezeichnung}  \n**Ordner:** ${folder}`;

  return (
    <Detail
      navigationTitle="Schritt 3 – Vorschau & Umbenennen"
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title={`${assignedCount} Files Umbenennen ↵`}
            icon={Icon.Pencil}
            onAction={doRename}
          />
          <Action title="Zurück" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function getNumberedFiles(folder: string): string[] {
  try {
    return fs
      .readdirSync(folder)
      .filter((f) => /^File\d+\./i.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
        const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
        return na - nb;
      });
  } catch {
    return [];
  }
}
