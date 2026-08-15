import fs from "fs";
import path from "path";
import os from "os";
import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { getMeetingSummary, getMeetingTranscript } from "../fathom/api";
import type { Meeting } from "../types/Types";
import { showContextualError } from "./errorHandling";
import { logger } from "@chrismessina/raycast-logger";

export type MeetingExportFormat = "txt" | "md" | "json";
export type MeetingExportType = "transcript" | "summary";
export type TeamExportFormat = "csv" | "vcf" | "json";

/**
 * Build a clean, readable filename for exports
 * Format: fathom-{type}-YYYY-MM-DD-{short-id}.{ext}
 * Example: fathom-summary-2025-09-30-abc123.md
 */
export function buildFilename(opts: {
  dateISO: string;
  id: string;
  type: MeetingExportType;
  format: MeetingExportFormat;
}): string {
  const date = opts.dateISO.slice(0, 10); // YYYY-MM-DD
  const shortId = opts.id.slice(0, 8); // First 8 chars of ID
  return `fathom-${opts.type}-${date}-${shortId}.${opts.format}`;
}

/**
 * Get the export directory from preferences or use default
 * Validates path to prevent directory traversal attacks
 */
function getExportDirectory(): string {
  const preferences = getPreferenceValues<Preferences>();
  let exportDir = preferences.exportDirectory;

  if (!exportDir) {
    return path.join(os.homedir(), "Downloads");
  }

  // Expand ~ to home directory
  if (exportDir.startsWith("~")) {
    exportDir = path.join(os.homedir(), exportDir.slice(1));
  }

  // Normalize and validate path is safe
  const normalizedPath = path.normalize(exportDir);
  const resolvedPath = path.resolve(normalizedPath);
  const homeDir = os.homedir();

  // Ensure path is within safe locations
  const safeLocations = [homeDir, "/tmp", "/var/tmp"];
  const isPathSafe = safeLocations.some((safe) => resolvedPath.startsWith(path.resolve(safe)));

  if (!isPathSafe) {
    logger.warn(`Unsafe export directory: ${resolvedPath}, using default`);
    return path.join(homeDir, "Downloads");
  }

  return resolvedPath;
}

/**
 * Find a unique filename by adding (2), (3), etc. if file exists
 */
function getUniqueFilePath(directory: string, baseFilename: string): string {
  const ext = path.extname(baseFilename);
  const nameWithoutExt = path.basename(baseFilename, ext);

  let filePath = path.join(directory, baseFilename);
  let counter = 2;

  while (fs.existsSync(filePath)) {
    const newFilename = `${nameWithoutExt} (${counter})${ext}`;
    filePath = path.join(directory, newFilename);
    counter++;
  }

  return filePath;
}

/**
 * Write file to the configured export directory with duplicate protection
 */
export async function writeFile(args: {
  dateISO: string;
  id: string;
  text: string;
  type: MeetingExportType;
  format: MeetingExportFormat;
}): Promise<string> {
  const { dateISO, id, text, type, format } = args;
  const directory = getExportDirectory();

  // Ensure directory exists
  fs.mkdirSync(directory, { recursive: true });

  // Build filename and get unique path
  const filename = buildFilename({ dateISO, id, type, format });
  const filePath = getUniqueFilePath(directory, filename);

  // Write file
  fs.writeFileSync(filePath, text, "utf8");

  return filePath;
}

/**
 * Quick export using preferences directory
 */
export async function quickExport(args: {
  dateISO: string;
  id: string;
  text: string;
  type: MeetingExportType;
  format: MeetingExportFormat;
}): Promise<string> {
  return writeFile(args);
}

/**
 * Export a contact as vCard format
 */
export async function exportAsVCard(args: {
  name: string;
  email: string;
  organization?: string;
  note?: string;
}): Promise<string> {
  const { name, email, organization, note } = args;

  // Build vCard 3.0 format (compatible with Apple Contacts)
  const vCardContent = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `EMAIL;TYPE=INTERNET:${email}`,
    organization ? `ORG:${organization}` : null,
    note ? `NOTE:${note}` : null,
    "END:VCARD",
  ]
    .filter((line): line is string => line !== null)
    .join("\r\n");

  const directory = getExportDirectory();
  const safeName = name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const filename = `${safeName}.vcf`;

  // Ensure directory exists
  fs.mkdirSync(directory, { recursive: true });

  // Get unique path and write file
  const filePath = getUniqueFilePath(directory, filename);
  fs.writeFileSync(filePath, vCardContent, "utf8");

  return filePath;
}

/**
 * Export multiple contacts as a combined vCard file
 */
export async function exportMultipleAsVCard(args: {
  contacts: Array<{
    name: string;
    email: string;
    organization?: string;
    note?: string;
  }>;
  filename: string;
}): Promise<string> {
  const { contacts, filename } = args;

  // Build combined vCard file with all contacts
  const vCardContent = contacts
    .map((contact) => {
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${contact.name}`,
        `EMAIL;TYPE=INTERNET:${contact.email}`,
        contact.organization ? `ORG:${contact.organization}` : null,
        contact.note ? `NOTE:${contact.note}` : null,
        "END:VCARD",
      ]
        .filter((line): line is string => line !== null)
        .join("\r\n");
    })
    .join("\r\n");

  const directory = getExportDirectory();
  const safeFilename = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;

  // Ensure directory exists
  fs.mkdirSync(directory, { recursive: true });

  // Get unique path and write file
  const filePath = getUniqueFilePath(directory, safeFilename);
  fs.writeFileSync(filePath, vCardContent, "utf8");

  return filePath;
}

/**
 * Universal meeting export function
 * Fetches meeting content and exports it with toast notifications
 */
export async function exportMeeting(args: {
  meeting: Meeting;
  recordingId: string;
  type: MeetingExportType;
  format: MeetingExportFormat;
}): Promise<void> {
  const { meeting, recordingId, type, format } = args;

  try {
    // Fetch the appropriate content
    const content = type === "summary" ? await getMeetingSummary(recordingId) : await getMeetingTranscript(recordingId);

    // Format content based on export format
    let exportText = content.text;
    if (format === "json") {
      exportText = JSON.stringify(content, null, 2);
    }

    // Export the file
    const filePath = await quickExport({
      dateISO: meeting.createdAt || meeting.startTimeISO,
      id: recordingId,
      text: exportText,
      type,
      format,
    });

    // Show success toast with action to open file
    await showToast({
      style: Toast.Style.Success,
      title: `${type === "summary" ? "Summary" : "Transcript"} Exported`,
      message: `Saved to ${filePath}`,
      primaryAction: {
        title: "Open in Finder",
        onAction: () => {
          open(filePath);
        },
      },
    });
  } catch (error) {
    await showContextualError(error, {
      action: "export meeting",
      fallbackTitle: "Export Failed",
    });
  }
}

/**
 * Universal team member export function
 * Exports team members in specified format with toast notifications
 */
export async function exportTeamMembers(args: {
  members: Array<{
    name: string;
    email: string;
    emailDomain?: string;
    createdAt?: string;
  }>;
  teamName: string;
  format: TeamExportFormat;
}): Promise<void> {
  const { members, teamName, format } = args;

  if (!members || members.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No members to export" });
    return;
  }

  try {
    const directory = getExportDirectory();
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeTeamName = teamName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");

    let filePath: string;
    let exportTitle: string;

    switch (format) {
      case "csv": {
        const csvContent = [
          "Name,Email,Email Domain,Created At",
          ...members.map((m) =>
            [m.name, m.email, m.emailDomain || "", m.createdAt || ""].map((v) => `"${v}"`).join(","),
          ),
        ].join("\n");

        const filename = `${safeTeamName}_members_${timestamp}.csv`;
        fs.mkdirSync(directory, { recursive: true });
        filePath = getUniqueFilePath(directory, filename);
        fs.writeFileSync(filePath, csvContent, "utf8");
        exportTitle = "Exported Team Members";
        break;
      }

      case "vcf": {
        const contacts = members.map((member) => ({
          name: member.name,
          email: member.email,
          organization: teamName,
          note: member.createdAt ? `Fathom member since ${new Date(member.createdAt).toLocaleDateString()}` : undefined,
        }));

        const filename = `${safeTeamName}_contacts`;
        filePath = await exportMultipleAsVCard({ contacts, filename });
        exportTitle = "Exported to Contacts";
        break;
      }

      case "json": {
        const jsonContent = JSON.stringify(
          {
            team: teamName,
            exportedAt: new Date().toISOString(),
            memberCount: members.length,
            members: members,
          },
          null,
          2,
        );

        const filename = `${safeTeamName}_members_${timestamp}.json`;
        fs.mkdirSync(directory, { recursive: true });
        filePath = getUniqueFilePath(directory, filename);
        fs.writeFileSync(filePath, jsonContent, "utf8");
        exportTitle = "Exported Team Data";
        break;
      }
    }

    const savedFilename = path.basename(filePath);

    await showToast({
      style: Toast.Style.Success,
      title: exportTitle,
      message: `${members.length} members saved to ${savedFilename}`,
      primaryAction: {
        title: "Open in Finder",
        onAction: () => {
          open(filePath);
        },
      },
    });
  } catch (error) {
    await showContextualError(error, {
      action: "export team members",
      fallbackTitle: "Export Failed",
    });
  }
}
