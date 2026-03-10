import { LocalStorage } from "@raycast/api";

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface StudentList {
  id: string;
  name: string;
  students: Student[];
  createdAt: number;
}

// ── Lists ─────────────────────────────────────────────────────────────────────
export async function loadLists(): Promise<StudentList[]> {
  const raw = await LocalStorage.getItem<string>("studentLists");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StudentList[];
  } catch {
    return [];
  }
}

export async function saveLists(lists: StudentList[]): Promise<void> {
  await LocalStorage.setItem("studentLists", JSON.stringify(lists));
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
// Accepts: Vorname,Nachname,Email (comma, semicolon or tab separated)
export function parseStudentCSV(raw: string): {
  students: Student[];
  errors: string[];
} {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const students: Student[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const parts = line
      .split(/[,;\t]/)
      .map((p) => p.trim().replace(/^["']|["']$/g, ""));

    if (parts.length < 3) {
      errors.push(`Ungültige Zeile (zu wenige Felder): "${line}"`);
      continue;
    }

    const [firstName, lastName, email] = parts;

    if (!firstName || !lastName || !email) {
      errors.push(`Fehlende Daten: "${line}"`);
      continue;
    }

    if (!email.includes("@")) {
      errors.push(`Ungültige E-Mail: "${email}"`);
      continue;
    }

    students.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      firstName,
      lastName,
      email: email.toLowerCase(),
    });
  }

  return { students, errors };
}

// ── Filename builder ──────────────────────────────────────────────────────────
export function buildFilename(
  email: string,
  bezeichnung: string,
  ext: string,
): string {
  return `${email}%${bezeichnung}${ext}`;
}
