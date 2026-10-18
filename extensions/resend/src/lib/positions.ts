import { readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute } from "node:path";
import type { ErrorResponse } from "resend";
import { getResend } from "./oauth";

export type PositionSummary = {
  id: string;
  title: string;
  department: string | null;
  team: string | null;
  location: string | null;
  employment_type: string | null;
  workplace_type: string | null;
  published_at: string | null;
};

export type PositionField = {
  path: string;
  title: string;
  type: string;
  required: boolean;
  description?: string;
  selectable_values?: { label: string; value: string }[];
};

export type Position = PositionSummary & {
  object: "job_posting";
  compensation: string | null;
  fields: PositionField[];
};

export type ApplicationInput = {
  /** Position ID from list-positions. Retrieve its questions before applying. */
  positionId: string;
  /** Applicant's own full name, explicitly supplied by the user. */
  name: string;
  /** Applicant's own email address, explicitly supplied by the user. */
  email: string;
  /** Absolute path to the local resume chosen by the user. Maximum 10 MB. */
  resumePath: string;
  /** User-provided answers using exact paths and option values from retrieve-position. Boolean values are "true" or "false". */
  answers: { path: string; value: string }[];
};

const systemFields = new Set(["name", "email", "resume"]);
const textTypes = new Set(["String", "Text", "LongText", "Email", "Number", "Location", "Phone", "Url", "URL"]);
const maxResumeBytes = 10 * 1024 * 1024;
const resumeMimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function positionUrl(id: string) {
  return `https://resend.com/careers/${encodeURIComponent(id)}`;
}

function apiError(error: ErrorResponse, submitting = false): Error {
  if (submitting && error.statusCode == null) {
    return new Error(
      `${error.message} Submission could not be confirmed. It may have been accepted. Check before submitting again.`,
    );
  }
  const authHint =
    error.statusCode === 401 || error.statusCode === 403
      ? " If your Resend login cannot access Careers, enter a Resend API key in extension preferences."
      : "";
  const uploadHint = error.statusCode === 413 ? " Choose a smaller resume file, no larger than 10 MB." : "";
  const rateLimitHint =
    error.statusCode === 429 ? " Resend is receiving too many requests. Wait before trying again." : "";
  return new Error(error.message + authHint + uploadHint + rateLimitHint, { cause: error.name });
}

export async function listPositions() {
  const { data, error } = await getResend().get<{ object: "list"; data: PositionSummary[] }>("/careers");
  if (error) throw apiError(error);
  return data;
}

export async function retrievePosition(positionId: string) {
  if (!positionId.trim()) throw new Error("Choose a position first");
  const { data, error } = await getResend().get<Position>(`/careers/${encodeURIComponent(positionId)}`);
  if (error) throw apiError(error);
  return data;
}

export function customFields(position: Position) {
  return position.fields.filter((field) => !systemFields.has(field.path));
}

export function supportsField(field: PositionField) {
  return (
    field.type !== "File" &&
    (Boolean(field.selectable_values?.length) || field.type === "Boolean" || textTypes.has(field.type))
  );
}

export function validateApplication(position: Position, input: ApplicationInput) {
  if (position.id !== input.positionId) throw new Error("The selected position changed. Review the application again.");
  if (!input.name.trim()) throw new Error("Name is required");
  if (!emailPattern.test(input.email.trim())) throw new Error("Enter a valid applicant email address");
  if (!isAbsolute(input.resumePath)) throw new Error("Choose a resume using an absolute local file path");
  const fields = new Map(customFields(position).map((field) => [field.path, field]));
  const answers = new Map<string, string>();
  for (const answer of input.answers) {
    if (systemFields.has(answer.path) || !fields.has(answer.path))
      throw new Error(`Unknown or reserved answer path: ${answer.path}`);
    if (answers.has(answer.path)) throw new Error(`Duplicate answer path: ${answer.path}`);
    answers.set(answer.path, answer.value);
  }
  for (const field of fields.values()) {
    const value = answers.get(field.path);
    if (!supportsField(field)) {
      if (field.required || value !== undefined)
        throw new Error(`Complete "${field.title}" on the Resend careers website; this field is not supported here`);
      continue;
    }
    if (!value?.trim()) {
      if (field.required) throw new Error(`${field.title} is required`);
      continue;
    }
    if (field.selectable_values?.length && !field.selectable_values.some((option) => option.value === value)) {
      throw new Error(`Choose a valid option for ${field.title}`);
    }
    if (field.type === "Boolean" && value !== "true" && value !== "false")
      throw new Error(`Answer Yes or No for ${field.title}`);
    if (field.type === "Number" && !Number.isFinite(Number(value)))
      throw new Error(`Enter a number for ${field.title}`);
    if (field.type === "Email" && !emailPattern.test(value.trim()))
      throw new Error(`Enter a valid email for ${field.title}`);
  }
}

export async function validateResume(resumePath: string) {
  let info;
  try {
    info = await stat(resumePath);
  } catch {
    throw new Error("Cannot access the selected resume. Choose a readable local file.");
  }
  if (!info.isFile()) throw new Error("The selected resume is not a file. Choose a PDF, DOC, DOCX, or TXT file.");
  validateResumeFile(resumePath, info.size);
}

function validateResumeFile(resumePath: string, size: number) {
  const errors: string[] = [];
  const extension = extname(resumePath).toLowerCase();
  if (!resumeMimeTypes[extension])
    errors.push(
      `Unsupported resume format (${extension || "no file extension"}). Choose a PDF, DOC, DOCX, or TXT file.`,
    );
  if (size === 0) errors.push("The selected resume is empty. Choose a file that contains your resume.");
  if (size > maxResumeBytes)
    errors.push(
      `Your resume is too large (${(size / 1024 / 1024).toFixed(2)} MB). The maximum is 10 MB (10,485,760 bytes). Compress it or choose a smaller file.`,
    );
  if (errors.length) throw new Error(errors.join("\n\n"));
}

export function applicationInfo(position: Position, input: ApplicationInput) {
  const fields = new Map(customFields(position).map((field) => [field.path, field]));
  return [
    { name: "Position", value: position.title },
    { name: "Location", value: position.location ?? "Not specified" },
    { name: "Position ID", value: position.id },
    { name: "Applicant", value: input.name },
    { name: "Email", value: input.email },
    { name: "Resume", value: input.resumePath },
    ...input.answers
      .filter((answer) => answer.value.trim())
      .map((answer) => {
        const field = fields.get(answer.path);
        const value =
          field?.selectable_values?.find((option) => option.value === answer.value)?.label ??
          (field?.type === "Boolean" ? (answer.value === "true" ? "Yes" : "No") : answer.value);
        return { name: field?.title ?? answer.path, value };
      }),
  ];
}

export async function applyToPosition(input: ApplicationInput) {
  const position = await retrievePosition(input.positionId);
  validateApplication(position, input);
  await validateResume(input.resumePath);
  let bytes: Buffer;
  try {
    bytes = await readFile(input.resumePath);
  } catch {
    throw new Error("Cannot read the selected resume. Choose a readable local file.");
  }
  validateResumeFile(input.resumePath, bytes.length);
  const form = new FormData();
  form.append("name", input.name.trim());
  form.append("email", input.email.trim());
  for (const answer of input.answers) {
    if (answer.value.trim()) form.append(answer.path, answer.value);
  }
  form.append(
    "resume",
    new Blob([new Uint8Array(bytes)], {
      type: resumeMimeTypes[extname(input.resumePath).toLowerCase()],
    }),
    basename(input.resumePath),
  );
  const { data, error } = await getResend().post<{ success: boolean }>(
    `/careers/${encodeURIComponent(input.positionId)}`,
    form,
  );
  if (error) throw apiError(error, true);
  if (!data.success) throw new Error("Resend did not confirm application submission. Check before submitting again.");
  return data;
}
