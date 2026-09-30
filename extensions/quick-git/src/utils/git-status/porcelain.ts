import { type BranchInfo, parseBranchHeaders } from "./branch.js";
import { parseFileStatus } from "./file.js";
import { ChangeStatus, parseChanges } from "./changes.js";
import { parseSubmodule, SubmoduleStatus } from "./submodule.js";

export interface StatusInfo {
  /** Path of the file */
  fileName: string;
  /** Original path of the file if it was renamed/copied */
  origPath?: string;
  /** Information about submodules */
  submodule: SubmoduleStatus;
  /** Information about the changes to this file */
  changes: ChangeStatus;
}

/**
 * Get the branch and file information from git status run with porcelain 2.
 * @param porcelainStatus The complete string from the porcelain 2 status command
 * @returns An object containing the branch and information on all changed files.
 */
export function parseGitStatusPorcelain(porcelainStatus: string): PorcelainInfo | undefined {
  if (!porcelainStatus) {
    return;
  }
  const data: PorcelainInfo = {
    branch: {
      name: "",
      commit: "",
    },
    files: [],
  };
  porcelainStatus.split("\n").forEach((statusRow) => {
    if (!statusRow) {
      return;
    }

    if (statusRow.startsWith("#")) {
      parseBranchHeaders(statusRow, data.branch);
    } else {
      data.files.push(parseFileData(statusRow));
    }
  });

  return data;
}

interface PorcelainInfo {
  branch: BranchInfo;
  files: StatusInfo[];
}

/**
 * Parse a row from git status in the Porcelain 2 format
 * @param dataRow
 * @returns
 */
function parseFileData(dataRow: string): StatusInfo {
  const fields = parseFileStatus(dataRow);
  let submoduleString = "";
  if (fields.indicator !== "?" && fields.indicator !== "!") {
    submoduleString = fields.submodule;
  }

  return {
    fileName: fields.path,
    origPath: fields.indicator === "2" ? fields.origPath : undefined,
    submodule: parseSubmodule(submoduleString),
    changes: parseChanges(fields),
  };
}
