import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  loadLists,
  parseStudentCSV,
  saveLists,
  Student,
  StudentList,
} from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// Main: List overview
// ─────────────────────────────────────────────────────────────────────────────
export default function ManageStudents() {
  const [lists, setLists] = useState<StudentList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadLists().then((l) => {
      setLists(l);
      setIsLoading(false);
    });
  }, []);

  async function deleteList(id: string) {
    const list = lists.find((l) => l.id === id);
    const ok = await confirmAlert({
      title: `Liste "${list?.name}" löschen?`,
      message: `${list?.students.length} Lernende werden entfernt.`,
      primaryAction: { title: "Löschen", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const updated = lists.filter((l) => l.id !== id);
    await saveLists(updated);
    setLists(updated);
    await showToast({ style: Toast.Style.Success, title: "Liste gelöscht" });
  }

  async function duplicateList(id: string) {
    const source = lists.find((l) => l.id === id);
    if (!source) return;

    const existingNames = lists.map((l) => l.name);
    const baseName = `${source.name} (Kopie)`;
    let copyName = baseName;
    let index = 2;
    while (existingNames.includes(copyName)) {
      copyName = `${source.name} (Kopie ${index})`;
      index += 1;
    }

    const duplicated: StudentList = {
      id: `${Date.now()}`,
      name: copyName,
      students: source.students.map((s) => ({
        ...s,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })),
      createdAt: Date.now(),
    };

    const updated = [...lists, duplicated];
    await saveLists(updated);
    setLists(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Liste dupliziert",
      message: `"${copyName}" mit ${duplicated.students.length} Lernenden erstellt`,
    });
  }

  const refresh = async () => {
    const updated = await loadLists();
    setLists(updated);
  };

  return (
    <List isLoading={isLoading} navigationTitle="Klassen / Listen">
      {lists.length === 0 ? (
        <List.EmptyView
          icon={Icon.PersonLines}
          title="Keine Listen vorhanden"
          description="⌘N – Neue Liste erstellen"
          actions={
            <ActionPanel>
              <Action
                title="Neue Liste Erstellen"
                icon={Icon.Plus}
                onAction={() => push(<CreateListForm onDone={refresh} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${lists.length} Listen`}>
          {lists.map((list) => (
            <List.Item
              key={list.id}
              icon={{ source: Icon.PersonLines, tintColor: Color.Blue }}
              title={list.name}
              subtitle={`${list.students.length} Lernende`}
              accessories={[
                { text: new Date(list.createdAt).toLocaleDateString("de-CH") },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Öffnen / Bearbeiten"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(<EditList list={list} onDone={refresh} />)
                    }
                  />
                  <Action
                    title="Liste Umbenennen"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() =>
                      push(<RenameListForm list={list} onDone={refresh} />)
                    }
                  />
                  <Action
                    title="Neue Liste Erstellen"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<CreateListForm onDone={refresh} />)}
                  />
                  <Action
                    title="Liste Duplizieren"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => duplicateList(list.id)}
                  />
                  <Action
                    title="Liste Löschen"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteList(list.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {lists.length > 0 && (
        <List.Section title="">
          <List.Item
            icon={Icon.Plus}
            title="Neue Liste erstellen"
            actions={
              <ActionPanel>
                <Action
                  title="Neue Liste Erstellen"
                  icon={Icon.Plus}
                  onAction={() => push(<CreateListForm onDone={refresh} />)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create new list (with CSV import)
// ─────────────────────────────────────────────────────────────────────────────
export function CreateListForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [preview, setPreview] = useState<{ count: number; errors: string[] }>({
    count: 0,
    errors: [],
  });

  function onCsvChange(val: string) {
    setCsv(val);
    if (!val.trim()) {
      setPreview({ count: 0, errors: [] });
      return;
    }
    const { students, errors } = parseStudentCSV(val);
    setPreview({ count: students.length, errors });
  }

  return (
    <Form
      navigationTitle="Neue Liste erstellen"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Liste Speichern"
            onSubmit={async () => {
              if (!name.trim()) {
                setNameError("Pflichtfeld");
                return;
              }

              const { students, errors } = parseStudentCSV(csv);

              if (csv.trim() && students.length === 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Keine gültigen Lernenden erkannt",
                  message: errors[0],
                });
                return;
              }

              const newList: StudentList = {
                id: `${Date.now()}`,
                name: name.trim(),
                students,
                createdAt: Date.now(),
              };

              const existing = await loadLists();
              await saveLists([...existing, newList]);
              await showToast({
                style: Toast.Style.Success,
                title: `"${name.trim()}" erstellt`,
                message: `${students.length} Lernende importiert`,
              });
              onDone();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Listen-Name"
        placeholder="z.B. Klasse 3a Mediamatik 2025"
        value={name}
        error={nameError}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        autoFocus
      />
      <Form.Separator />
      <Form.TextArea
        id="csv"
        title="Lernende importieren"
        placeholder={`Aus Excel kopieren oder manuell eingeben:\nVorname,Nachname,Email\n\nBeispiel:\nMelvin,Lauber,melvin.lauber@bbcag.ch\nLukas,Näf,lukas.naef@bbcag.ch`}
        value={csv}
        onChange={onCsvChange}
        info="Format: Vorname,Nachname,Email – eine Person pro Zeile. Komma, Semikolon oder Tab als Trennzeichen."
      />
      {preview.count > 0 && (
        <Form.Description
          title="✓ Erkannt"
          text={`${preview.count} Lernende werden importiert${preview.errors.length > 0 ? ` (${preview.errors.length} Zeilen übersprungen)` : ""}`}
        />
      )}
      {preview.errors.length > 0 && (
        <Form.Description
          title="⚠ Übersprungen"
          text={preview.errors.join("\n")}
        />
      )}
    </Form>
  );
}

function RenameListForm({
  list,
  onDone,
}: {
  list: StudentList;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(list.name);
  const [nameError, setNameError] = useState<string | undefined>();

  return (
    <Form
      navigationTitle="Liste umbenennen"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Umbenennen"
            onSubmit={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                setNameError("Pflichtfeld");
                return;
              }

              const all = await loadLists();
              const nameTaken = all.some(
                (l) =>
                  l.id !== list.id &&
                  l.name.toLowerCase() === trimmed.toLowerCase(),
              );
              if (nameTaken) {
                setNameError("Name bereits vorhanden");
                return;
              }

              const updated = all.map((l) =>
                l.id === list.id ? { ...l, name: trimmed } : l,
              );
              await saveLists(updated);
              await showToast({
                style: Toast.Style.Success,
                title: "Liste umbenannt",
                message: `"${list.name}" → "${trimmed}"`,
              });
              onDone();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Neuer Listen-Name"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        autoFocus
      />
    </Form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit existing list
// ─────────────────────────────────────────────────────────────────────────────
function EditList({ list, onDone }: { list: StudentList; onDone: () => void }) {
  const { push } = useNavigation();
  const [students, setStudents] = useState<Student[]>(list.students);

  async function save(updated: Student[]) {
    const all = await loadLists();
    const newAll = all.map((l) =>
      l.id === list.id ? { ...l, students: updated } : l,
    );
    await saveLists(newAll);
    setStudents(updated);
    onDone();
  }

  async function remove(id: string) {
    const s = students.find((x) => x.id === id);
    const ok = await confirmAlert({
      title: `${s?.firstName} ${s?.lastName} entfernen?`,
      primaryAction: {
        title: "Entfernen",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    await save(students.filter((x) => x.id !== id));
    await showToast({
      style: Toast.Style.Success,
      title: "Lernende/r entfernt",
    });
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = students.findIndex((s) => s.id === id);
    const to = idx + dir;
    if (to < 0 || to >= students.length) return;
    const updated = [...students];
    [updated[idx], updated[to]] = [updated[to], updated[idx]];
    await save(updated);
  }

  const onAdded = async (s: Student) => {
    const updated = [...students, s];
    await save(updated);
    await showToast({
      style: Toast.Style.Success,
      title: `${s.firstName} ${s.lastName} hinzugefügt`,
    });
  };

  return (
    <List navigationTitle={`${list.name} – ${students.length} Lernende`}>
      <List.Section
        title={`${students.length} Lernende – Reihenfolge = File1, File2 …`}
      >
        {students.map((s, i) => (
          <List.Item
            key={s.id}
            icon={{ source: Icon.Person, tintColor: Color.Blue }}
            title={`${s.firstName} ${s.lastName}`}
            subtitle={s.email}
            accessories={[
              { tag: { value: `File${i + 1}`, color: Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Reihenfolge">
                  <Action
                    title="Nach Oben"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                    onAction={() => move(s.id, -1)}
                  />
                  <Action
                    title="Nach Unten"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                    onAction={() => move(s.id, 1)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Lernenden Hinzufügen"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddStudentForm onAdd={onAdded} />)}
                  />
                  <Action
                    title="Entfernen"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => remove(s.id)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="">
        <List.Item
          icon={Icon.Plus}
          title="Lernenden hinzufügen"
          actions={
            <ActionPanel>
              <Action
                title="Hinzufügen"
                icon={Icon.Plus}
                onAction={() => push(<AddStudentForm onAdd={onAdded} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add single student form
// ─────────────────────────────────────────────────────────────────────────────
export function AddStudentForm({
  onAdd,
}: {
  onAdd: (s: Student) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [lastNameError, setLastNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();

  return (
    <Form
      navigationTitle="Lernenden hinzufügen"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Speichern"
            onSubmit={async () => {
              let valid = true;
              if (!firstName.trim()) {
                setFirstNameError("Pflichtfeld");
                valid = false;
              }
              if (!lastName.trim()) {
                setLastNameError("Pflichtfeld");
                valid = false;
              }
              if (!email.trim() || !email.includes("@")) {
                setEmailError("Gültige E-Mail erforderlich");
                valid = false;
              }
              if (!valid) return;
              await onAdd({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fn"
        title="Vorname"
        placeholder="Ayan"
        value={firstName}
        error={firstNameError}
        onChange={(v) => {
          setFirstName(v);
          setFirstNameError(undefined);
        }}
        autoFocus
      />
      <Form.TextField
        id="ln"
        title="Nachname"
        placeholder="Navaneethan"
        value={lastName}
        error={lastNameError}
        onChange={(v) => {
          setLastName(v);
          setLastNameError(undefined);
        }}
      />
      <Form.TextField
        id="em"
        title="E-Mail"
        placeholder="ayan.navaneethan@bbcag.ch"
        value={email}
        error={emailError}
        onChange={(v) => {
          setEmail(v);
          setEmailError(undefined);
        }}
        info="Wird als Präfix im Dateinamen: email%Bezeichnung.pdf"
      />
    </Form>
  );
}
