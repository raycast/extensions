import { createContext, useContext } from "react";
import { showFailureToast, useExec } from "@raycast/utils";
import { parseGitStatusPorcelain } from "../utils/git-status/porcelain.js";

export function useGitStatus(repo?: string) {
  return useExec("git", ["status", "--porcelain=2", "--branch"], {
    cwd: repo,
    execute: !!repo,
    keepPreviousData: false,
    onError: (error) => {
      showFailureToast(error, { title: "Could not fetch git status" });
    },
    parseOutput: ({ stdout }) => parseGitStatusPorcelain(stdout),
  });
}

export const CheckStatusContext = createContext<() => void>(() => {
  throw Error("Cannot check status: CheckStatusContext was not initialized");
});

export function useCheckStatus() {
  return useContext(CheckStatusContext);
}
