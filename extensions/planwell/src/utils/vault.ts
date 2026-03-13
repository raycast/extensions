import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getPreferenceValues } from "@raycast/api";
import { Class, Period, Occurrence, Event, Todo } from "../types";

interface Preferences {
  vaultPath: string;
}

export function getVaultPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.vaultPath || "";
}

export function getClasses(): Class[] {
  const vaultPath = getVaultPath();
  if (!vaultPath) return [];

  const classesPath = path.join(vaultPath, "classes");
  if (!fs.existsSync(classesPath)) return [];

  const files = fs.readdirSync(classesPath).filter((f) => f.endsWith(".md"));

  return files.map((file) => {
    const filePath = path.join(classesPath, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);

    const occurrences: Occurrence[] = [];
    Object.keys(data).forEach((key) => {
      if (key.startsWith("occurrence")) {
        const value = data[key] as string;
        const parts = value.split(",").map((p) => p.trim());
        const dayPart = parts.find((p) => p.startsWith("dayOfWeek:"));
        const periodPart = parts.find((p) => p.startsWith("period:"));

        if (dayPart && periodPart) {
          occurrences.push({
            dayOfWeek: parseInt(dayPart.split(":")[1]),
            period: periodPart.split(":")[1]?.replace(/^period-/, ""),
          });
        }
      }
    });

    return {
      id: file.replace(".md", ""),
      name: data.name || file.replace(".md", ""),
      occurrences,
      content,
    };
  });
}

export function getPeriods(): Period[] {
  const vaultPath = getVaultPath();
  if (!vaultPath) return [];

  const periodsPath = path.join(vaultPath, "settings", "periods.md");
  if (!fs.existsSync(periodsPath)) return [];

  const fileContent = fs.readFileSync(periodsPath, "utf8");
  const { data } = matter(fileContent);

  const periods: Period[] = [];

  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (typeof value !== "string" || !value.includes("|")) return;

    const [labelPart, timePart] = value.split("|");
    let startTime: string | undefined;
    let endTime: string | undefined;
    let isSpecial = false;

    if (timePart === "special") {
      isSpecial = true;
    } else if (timePart && timePart.includes("-")) {
      [startTime, endTime] = timePart.split("-");
    }

    periods.push({
      id: key,
      label: labelPart,
      startTime,
      endTime,
      isSpecial,
    });
  });

  return periods;
}

export function getEvents(): Event[] {
  const vaultPath = getVaultPath();
  if (!vaultPath) return [];

  const eventsPath = path.join(vaultPath, "events");
  if (!fs.existsSync(eventsPath)) return [];

  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".md"));

  return files.map((file) => {
    const filePath = path.join(eventsPath, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);

    return {
      id: file.replace(".md", ""),
      name: data.name || file.replace(".md", ""),
      startDate: data.startDate,
      endDate: data.endDate || data.startDate,
      content,
    };
  });
}

export function getTodos(): Todo[] {
  const vaultPath = getVaultPath();
  if (!vaultPath) return [];

  const todosPath = path.join(vaultPath, "todos");
  if (!fs.existsSync(todosPath)) return [];

  const files = fs.readdirSync(todosPath).filter((f) => f.endsWith(".md"));

  return files.map((file) => {
    const filePath = path.join(todosPath, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);

    return {
      id: file.replace(".md", ""),
      name: data.name || file.replace(".md", ""),
      isCompleted: data.isDone || false,
      content,
    };
  });
}

export function toggleTodoComplete(todoId: string): void {
  const vaultPath = getVaultPath();
  if (!vaultPath) throw new Error("Vault path not set");

  const todoPath = path.join(vaultPath, "todos", `${todoId}.md`);
  if (!fs.existsSync(todoPath)) throw new Error("Todo not found");

  const fileContent = fs.readFileSync(todoPath, "utf8");
  const { data, content } = matter(fileContent);

  data.isDone = !data.isDone;

  const newContent = matter.stringify(content, data);
  fs.writeFileSync(todoPath, newContent);
}

export function createClass(
  name: string,
  period: string,
  dayOfWeek: number,
  note: string,
): void {
  const vaultPath = getVaultPath();
  if (!vaultPath) throw new Error("Vault path not set");

  const classesPath = path.join(vaultPath, "classes");
  if (!fs.existsSync(classesPath)) {
    fs.mkdirSync(classesPath, { recursive: true });
  }

  // Generate filename from name, add suffix if exists
  const baseName = name.replace(/[^a-zA-Z0-9]/g, "");
  let fileName = `${baseName}.md`;
  let filePath = path.join(classesPath, fileName);
  let counter = 1;

  while (fs.existsSync(filePath)) {
    fileName = `${baseName}(${counter}).md`;
    filePath = path.join(classesPath, fileName);
    counter++;
  }

  const now = new Date();
  const createdIso = now.toISOString();
  const startDate = createdIso.split("T")[0];
  const safePeriod = period.startsWith("period-")
    ? period.replace("period-", "")
    : period;

  const frontmatter = {
    name,
    isImportant: false,
    created: createdIso,
    isRecurring: false,
    startDate,
    date: startDate,
    periodId: `period-${safePeriod}`,
    [`occurrence 1`]: `dayOfWeek:${dayOfWeek}, period:${safePeriod}`,
  };

  const content = matter.stringify(note || "", frontmatter);
  fs.writeFileSync(filePath, content);
}

export function deleteClass(classId: string): void {
  const vaultPath = getVaultPath();
  if (!vaultPath) throw new Error("Vault path not set");

  const classPath = path.join(vaultPath, "classes", `${classId}.md`);
  if (!fs.existsSync(classPath)) throw new Error("Class not found");

  // Move to bin folder instead of permanent delete
  const binPath = path.join(vaultPath, "bin");
  if (!fs.existsSync(binPath)) {
    fs.mkdirSync(binPath, { recursive: true });
  }

  const binFilePath = path.join(binPath, `${classId}.md`);
  fs.renameSync(classPath, binFilePath);
}
