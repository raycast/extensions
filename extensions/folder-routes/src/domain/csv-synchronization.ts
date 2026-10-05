import { type Destination, findDuplicateFields, validateDestinationDraft } from "./destination";
import { parseCsvImport } from "./import";

export interface CsvSynchronizationIssue {
  sourceLabel: string;
  messages: string[];
}

export interface CsvSynchronizationValidation {
  destinations: Destination[];
  fatalErrors: string[];
  issues: CsvSynchronizationIssue[];
}

export async function validateCsvSynchronization(
  content: string,
  isDirectory: (path: string) => Promise<boolean>,
): Promise<CsvSynchronizationValidation> {
  const parsed = parseCsvImport(content);
  if (parsed.fatalErrors.length > 0) {
    return { destinations: [], fatalErrors: parsed.fatalErrors, issues: [] };
  }
  const candidates: Array<{ destination: Destination; sourceLabel: string }> = [];
  const issues: CsvSynchronizationIssue[] = [];

  for (const entry of parsed.entries) {
    const messages = [...entry.errors];
    if (!entry.draft) {
      issues.push({ sourceLabel: entry.sourceLabel, messages });
      continue;
    }

    const validation = validateDestinationDraft(entry.draft);
    messages.push(...validation.errors);
    if (!entry.draft.id?.trim()) {
      messages.push("A stable ID is required for synchronization.");
    }
    if (!validation.value || messages.length > 0) {
      issues.push({ sourceLabel: entry.sourceLabel, messages });
      continue;
    }

    candidates.push({
      sourceLabel: entry.sourceLabel,
      destination: {
        ...validation.value,
        id: entry.draft.id!.trim(),
      },
    });
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const duplicateFields = findDuplicateFields(
      candidate.destination,
      candidates.slice(0, index).map((earlier) => earlier.destination),
    );
    if (duplicateFields.length > 0) {
      issues.push({
        sourceLabel: candidate.sourceLabel,
        messages: [`Duplicates an earlier ${duplicateFields.join(", ")}.`],
      });
    }
  }

  const folderChecks = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      exists: await isDirectory(candidate.destination.path),
    })),
  );
  for (const folderCheck of folderChecks) {
    if (!folderCheck.exists) {
      issues.push({
        sourceLabel: folderCheck.sourceLabel,
        messages: [`Folder does not exist or is not a directory: ${folderCheck.destination.path}`],
      });
    }
  }

  return {
    destinations: candidates.map((candidate) => candidate.destination),
    fatalErrors: [],
    issues,
  };
}

export function formatCsvSynchronizationErrors(validation: CsvSynchronizationValidation): string[] {
  return [
    ...validation.fatalErrors,
    ...validation.issues.flatMap((issue) => issue.messages.map((message) => `${issue.sourceLabel}: ${message}`)),
  ];
}
