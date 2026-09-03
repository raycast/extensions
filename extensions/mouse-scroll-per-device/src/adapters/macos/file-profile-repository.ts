import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { OperationResult, ProfileDocument, validateProfileDocument } from "../../domain/models";
import { ProfileRepository } from "../../ports/profile-repository";

export class FileProfileRepository implements ProfileRepository {
  constructor(private readonly path: string) {}

  async load(): Promise<OperationResult<ProfileDocument>> {
    try {
      const raw = await readFile(this.path, "utf8");
      const parsed: unknown = JSON.parse(raw);
      const invalid = validateProfileDocument(parsed);
      if (invalid) throw new Error(invalid);
      return { status: "succeeded", value: parsed as ProfileDocument };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { status: "succeeded", value: { version: 1, profiles: {} } };
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  async save(document: ProfileDocument): Promise<OperationResult<void>> {
    try {
      const invalid = validateProfileDocument(document);
      if (invalid) return { status: "failed", error: invalid };
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.tmp-${process.pid}-${Date.now()}`;
      await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.path);
      return { status: "succeeded", value: undefined, receipt: { detail: `Atomic write: ${this.path}` } };
    } catch (error) {
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }
}
