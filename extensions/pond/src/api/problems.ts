import { PondApiError } from "pond-api";

export type ProblemKind = "not-installed" | "not-running" | "unauthorized" | "outdated" | "misconfigured" | "failed";

export class PondProblem extends Error {
  readonly kind: ProblemKind;

  constructor(kind: ProblemKind, message: string) {
    super(message);
    this.name = "PondProblem";
    this.kind = kind;
  }
}

/** Every route the extension calls shipped in Local API 2.1. */
export function supportsApi(version: string | undefined): boolean {
  const [major, minor] = (version ?? "").split(".").map(Number);
  return major === 2 && minor >= 1;
}

export function problemOf(error: Error): PondProblem {
  if (error instanceof PondProblem) return error;
  if (error instanceof PondApiError) {
    if (error.kind === "authentication") return new PondProblem("unauthorized", error.message);
    if (error.kind === "connection") return new PondProblem("not-running", error.message);
    if (error.kind === "not-found" && error.code === undefined) return new PondProblem("outdated", error.message);
  }
  return new PondProblem("failed", error.message);
}

/** Takes whatever a `catch` clause or a rejected promise holds. */
export function toError(value: NonNullable<unknown> | null | undefined): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export interface ProblemCopy {
  title: string;
  description: string;
}

export function problemCopy(problem: PondProblem): ProblemCopy {
  switch (problem.kind) {
    case "not-installed":
      return {
        title: "Pond isn't installed",
        description: "Install Pond on this Mac to search and save from Raycast.",
      };
    case "not-running":
      return {
        title: "Pond isn't running",
        description: "Open Pond, then try again. Turn on Launch at Login in Pond Settings to keep it ready.",
      };
    case "unauthorized":
      return {
        title: "Token not accepted",
        description: "Copy the Local API Token from Pond Settings, then paste it into the extension preferences.",
      };
    case "outdated":
      return {
        title: "Pond needs an update",
        description: `This extension needs a newer Pond. ${problem.message}`.trim(),
      };
    case "misconfigured":
      return {
        title: "Local API URL not valid",
        description: `${problem.message} Fix it in the extension preferences.`,
      };
    case "failed":
      return { title: "Couldn't reach your library", description: problem.message };
  }
}
