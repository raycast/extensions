import { environment } from "@raycast/api";
import { WritableAtom } from "nanostores";
import path from "path";
import fs from "fs/promises";
import { $collections } from "~/store";
import z from "zod";
import { Collection, collectionSchema, Environment, environmentsSchema, HistoryEntry, historySchema } from "~/types";
import { $environments } from "~/store/environments";
import { $history } from "~/store/history";

/**
 * Exports the current state of a Nanostores atom to a specified file.
 * @param atom The atom to export.
 * @param serialize A function to convert the atom's data to a string.
 * @param fileName The name of the file to save in the support path.
 */
export async function exportAtomToFile<T>(atom: WritableAtom<T>, serialize: (v: T) => string, filePath: string) {
  const serializedValue = serialize(atom.get());
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, serializedValue);
}

/**
 * The main function for creating a full backup of all data.
 */
export async function backupAllData() {
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const backupDir = path.join(environment.supportPath, "backups", timestamp);

  await Promise.all([
    exportAtomToFile(
      $collections,
      (d: Collection[]) => JSON.stringify(z.array(collectionSchema).parse(d)),
      path.join(backupDir, "collections.json"),
    ),
    exportAtomToFile(
      $environments,
      (d: Environment[]) => {
        // Remove secret values for security reasons
        const sanitized = d.map((env) => ({
          ...env,
          variables: Object.fromEntries(
            Object.entries(env.variables).map(([key, variable]) => [
              key,
              variable.isSecret ? { ...variable, value: "" } : variable,
            ]),
          ),
        }));
        return JSON.stringify(environmentsSchema.parse(sanitized));
      },
      path.join(backupDir, "environments.json"),
    ),
    exportAtomToFile(
      $history,
      (d: HistoryEntry[]) => JSON.stringify(historySchema.parse(d)),
      path.join(backupDir, "history.json"),
    ),
  ]);
}
