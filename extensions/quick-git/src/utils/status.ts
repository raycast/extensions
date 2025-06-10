import { BranchInfo, parseBranchHeaders } from "./branch.js";

export type GitStatus =
  | /** unmodified */
  "."
  /** modified */
  | "M"
  /** file type changed (regular file, symbolic link or submodule) */
  | "T"
  /** added */
  | "A"
  /** deleted */
  | "D"
  /** renamed */
  | "R"
  /** copied (if config option status.renames is set to "copies") */
  | "C"
  /** updated but unmerged */
  | "U"
  /** untracked */
  | "?"
  /** ignored */
  | "!";

type GitStatusFormat = "changed" | "renamed" | "unmerged" | "untracked" | "ignored";

export interface StatusInfo {
  format: GitStatusFormat;
  /** Path of the file */
  fileName: string;
  /** Original path of the file if it was renamed/copied */
  origPath?: string;
  /** Status of the index */
  staged: GitStatus;
  /** Status of the working tree */
  unstaged: GitStatus;
  /** Is the  */
  submodule?: boolean;
}

/**
 * Git Status Porcelain Format Version 2 have 3 lines indicated by the first character:
 * - `1`: A changed file
 * - `2`: A renamed file
 * - `u`: An unmerged file
 *
 * There are also two other options:
 * - `?` An untracked file
 * - `!` An ignored file
 */
function lineFormat(format: string): GitStatusFormat {
  switch (format) {
    case "1":
      return "changed";
    case "2":
      return "renamed";
    case "u":
      return "unmerged";
    case "?":
      return "untracked";
    default:
      return "ignored";
  }
}

function parseChanges(xy: string): [GitStatus, GitStatus] {
  return [xy.charAt(0) as GitStatus, xy.charAt(1) as GitStatus];
}

function parseUntracked(fields: string[]): StatusInfo {
  const fileName = fields.at(-1) ?? "";
  return {
    format: "untracked",
    fileName,
    staged: ".",
    unstaged: "?",
  };
}

function parseRenamed(fields: string[]): StatusInfo {
  const path = fields.at(-1) ?? "";
  const [fileName, origPath] = path.split(/\s/);
  const [staged, unstaged] = parseChanges(fields[1]);

  return {
    format: "renamed",
    fileName,
    origPath,
    staged,
    unstaged,
    submodule: isSubmodule(fields[2]),
  };
}

function isSubmodule(field: string) {
  return !field.startsWith("N");
}

/**
 * Parse a row from git status in the Porcelain 2 format
 * @param dataRow
 * @returns
 */
export function parseGitFileStatus(dataRow: string): StatusInfo {
  const fields = dataRow.split(" ");
  const format = lineFormat(fields[0]);
  if (format === "untracked") {
    return parseUntracked(fields);
  } else if (format === "renamed") {
    return parseRenamed(fields);
  }
  const fileName = fields.at(-1) ?? "";
  const [staged, unstaged] = parseChanges(fields[1]);

  return {
    format,
    fileName,
    staged,
    unstaged,
    submodule: isSubmodule(fields[2]),
  };
}

export function parseGitStatus(porcelainStatus: string):
  | {
      branch: BranchInfo;
      files: StatusInfo[];
    }
  | undefined {
  if (!porcelainStatus) {
    return;
  }

  const status = porcelainStatus.split("\n");
  const branch: BranchInfo = {
    name: "",
    commit: "",
  };
  const files: StatusInfo[] = [];
  status.forEach((statusRow) => {
    if (!statusRow) {
      return;
    }

    if (statusRow.startsWith("#")) {
      parseBranchHeaders(statusRow, branch);
    } else {
      files.push(parseGitFileStatus(statusRow));
    }
  });

  return { branch, files };
}
