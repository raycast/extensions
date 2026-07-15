import { FileStatus } from "./file.js";

/**
 * Letter code that indicates the type of changes.
 * - `.` Unmodified
 * - `M` Modified
 * - `T` File type changed (regular file, symbolic link or submodule)
 * - `A` Added
 * - `D` Deleted
 * - `R` Renamed
 * - `C` Copied (if config option status.renames is set to "copies")
 * - `U` Updated but unmerged
 * - `?` Untracked
 * - `!` Ignored
 */
export type StatusValue = "." | "M" | "T" | "A" | "D" | "R" | "C" | "U" | "?" | "!";

export interface ChangeStatus {
  isTracked: boolean;
  hasUnstagedChanges: boolean;
  unstagedChanges: StatusValue;
  hasStagedChanges: boolean;
  stagedChanges: StatusValue;
  changeScore?: number;
  unmergedChanges: boolean;
}

export function parseChanges(fileStatus: FileStatus): ChangeStatus {
  if (fileStatus.indicator === "!" || fileStatus.indicator === "?") {
    return {
      isTracked: false,
      hasStagedChanges: false,
      stagedChanges: fileStatus.indicator,
      hasUnstagedChanges: true,
      unstagedChanges: fileStatus.indicator,
      unmergedChanges: false,
    };
  }

  const [index, workingTree] = splitChanges(fileStatus.xy);
  const status: ChangeStatus = {
    isTracked: true,
    hasUnstagedChanges: /[^.?!]/.test(workingTree),
    unstagedChanges: workingTree,
    hasStagedChanges: index !== ".",
    stagedChanges: index,
    unmergedChanges:
      index === "U" ||
      workingTree === "U" ||
      (index === "A" && workingTree === "A") ||
      (index === "D" && workingTree === "D"),
  };

  if (fileStatus.indicator === "2") {
    status.changeScore = fileStatus.rcScore;
  }

  return status;
}

/**
 * Split the indicated changes into a tuple
 * @param xy Two character field indicating staged and unstaged changes
 * @returns The changes that are staged, and the working changed
 */
export function splitChanges(xy: string): [StatusValue, StatusValue] {
  return [xy.charAt(0) as StatusValue, xy.charAt(1) as StatusValue];
}

export type StatusValueName = ReturnType<typeof parseStatusValueName>;

export function parseStatusValueName(status: StatusValue) {
  if (status === ".") {
    return;
  }

  switch (status) {
    case "M":
      return "Modified";
    case "T":
      return "Type changed";
    case "A":
      return "Added";
    case "D":
      return "Deleted";
    case "R":
      return "Renamed";
    case "C":
      return "Copied";
    case "U":
      return "Unmerged";
    case "?":
      return "Untracked";
    case "!":
      return "Ignored";
  }
}
