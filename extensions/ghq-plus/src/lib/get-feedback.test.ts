import { describe, expect, it } from "vitest";
import { GhqCancelledError, GhqError, type GetResult } from "./get";
import type { Repository } from "./ghq";
import { describeGetError, describeGetResult } from "./get-feedback";

const ESC = String.fromCharCode(27);

function repository(relativePath: string): Repository {
  const [host, owner, name] = relativePath.split("/");
  return { path: `/Users/me/ghq/${relativePath}`, relativePath, name, owner, host };
}

describe("describeGetResult", () => {
  it('titles a new clone "Cloned" and shows the relative path of the repository', () => {
    const result: GetResult = { status: "cloned", repositories: [repository("github.com/windhorn/ghq")] };

    expect(describeGetResult(result, "https://github.com/windhorn/ghq")).toEqual({
      title: "Cloned",
      message: "github.com/windhorn/ghq",
    });
  });

  it('titles an existing repository "Already cloned"', () => {
    const result: GetResult = { status: "exists", repositories: [repository("github.com/windhorn/ghq")] };

    expect(describeGetResult(result, "windhorn/ghq")).toEqual({
      title: "Already cloned",
      message: "github.com/windhorn/ghq",
    });
  });

  it("shows the first repository when there are several", () => {
    const result: GetResult = {
      status: "exists",
      repositories: [repository("github.com/windhorn/ghq"), repository("github.com/x-motemen/ghq")],
    };

    expect(describeGetResult(result, "ghq").message).toBe("github.com/windhorn/ghq");
  });

  it('titles an outcome that cannot be told apart "Repository ready" instead of claiming a clone', () => {
    const result: GetResult = { status: "unknown", repositories: [repository("github.com/windhorn/ghq")] };

    expect(describeGetResult(result, "https://github.com/Windhorn/GHQ")).toEqual({
      title: "Repository ready",
      message: "github.com/windhorn/ghq",
    });
    expect(describeGetResult({ status: "unknown", repositories: [] }, "windhorn/ghq.git")).toEqual({
      title: "Repository ready",
      message: "windhorn/ghq.git",
    });
  });

  it("falls back to the input when no repository was found", () => {
    expect(describeGetResult({ status: "cloned", repositories: [] }, "windhorn/ghq")).toEqual({
      title: "Cloned",
      message: "windhorn/ghq",
    });
  });
});

describe("describeGetError", () => {
  it('titles a cancelled run "Cancelled", shows the input and offers no logs', () => {
    expect(describeGetError(new GhqCancelledError(), "windhorn/ghq")).toEqual({
      title: "Cancelled",
      message: "windhorn/ghq",
    });
  });

  it("shows the one-line summary of a ghq failure and offers the ANSI-stripped stderr as logs", () => {
    const stderr = `${ESC}[1;32m     clone${ESC}[0m https://github.com/windhorn/nope\nfatal: repository not found\n`;
    const error = new GhqError("repository not found", stderr);

    expect(describeGetError(error, "windhorn/nope")).toEqual({
      title: "Failed to get repository",
      message: "repository not found",
      logs: "     clone https://github.com/windhorn/nope\nfatal: repository not found\n",
    });
  });

  it('titles any other error "Failed to run ghq" and shows its message', () => {
    expect(describeGetError(new Error("spawn /nope/ghq ENOENT"), "windhorn/ghq")).toEqual({
      title: "Failed to run ghq",
      message: "spawn /nope/ghq ENOENT",
    });
  });

  it("stringifies a thrown value that is not an Error", () => {
    expect(describeGetError("boom", "windhorn/ghq")).toEqual({ title: "Failed to run ghq", message: "boom" });
  });
});
