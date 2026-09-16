import { ValidationError } from "../domain/errors";
import type { Task } from "../domain/task";

function requireNonBlank(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(message);
  }

  return value;
}

function isWellFormedWithoutControls(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return true;
}

function isNativeTaskLinkSegment(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    isWellFormedWithoutControls(value) &&
    !Array.from(value).some((character) => /\p{Cf}/u.test(character))
  );
}

function isAsciiCaseInsensitiveMatch(value: string, expectedLowercase: string): boolean {
  if (value.length !== expectedLowercase.length) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const lowercaseCodeUnit = codeUnit >= 0x41 && codeUnit <= 0x5a ? codeUnit + 0x20 : codeUnit;
    if (lowercaseCodeUnit !== expectedLowercase.charCodeAt(index)) return false;
  }

  return true;
}

function hasWhitespace(value: string): boolean {
  return Array.from(value).some((character) => /\s/u.test(character));
}

function hasExactRawTickTickAuthority(value: string): boolean {
  const schemeSeparator = value.indexOf("://");
  if (schemeSeparator <= 0 || !isAsciiCaseInsensitiveMatch(value.slice(0, schemeSeparator), "https")) return false;

  const authorityStart = schemeSeparator + 3;
  let authorityEnd = value.length;
  for (const delimiter of ["/", "?", "#"]) {
    const delimiterIndex = value.indexOf(delimiter, authorityStart);
    if (delimiterIndex >= 0 && delimiterIndex < authorityEnd) authorityEnd = delimiterIndex;
  }

  return isAsciiCaseInsensitiveMatch(value.slice(authorityStart, authorityEnd), "ticktick.com");
}

export function nativeExactTaskUrl(task: Task): string {
  if (!isNativeTaskLinkSegment(task.projectId)) throw new ValidationError("A task project ID is required.");
  if (!isNativeTaskLinkSegment(task.id)) throw new ValidationError("A task ID is required.");

  return `ticktick://widget.view.task.in.project/${encodeURIComponent(task.projectId)}/${encodeURIComponent(task.id)}`;
}

export function isNativeExactTaskLinkable(task: Pick<Task, "id" | "projectId">): boolean {
  return isNativeTaskLinkSegment(task.projectId) && isNativeTaskLinkSegment(task.id);
}

export function searchTaskUrl(task: Task): string {
  const title = requireNonBlank(task.title, "A task title is required.");

  return `ticktick://v1/search?keyword=${encodeURIComponent(title)}`;
}

export function isAllowedBackendExactTaskUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !isWellFormedWithoutControls(value) ||
    hasWhitespace(value) ||
    !hasExactRawTickTickAuthority(value)
  ) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return (
    parsed.protocol === "https:" &&
    parsed.hostname === "ticktick.com" &&
    parsed.port === "" &&
    parsed.username === "" &&
    parsed.password === ""
  );
}
