/**
 * 4 character letter code indicating information about a git submodule:
 * - `S` Indicates that this is a submodule
 * - `C` There are changes within the submodule
 * - `M` There are tracked changes within the submodule
 * - `U` There are untracked changed within the submodule
 * - `.` Empty value
 */
export type SubmoduleString = `S${"C" | "."}${"M" | "."}${"U" | "."}`;

/**
 * Parse submodule status from porcelain version 2.
 * @param sub A 4 character field describing the submodule state
 * @returns An object describing the state of the submodule
 */
export function parseSubmodule(sub: string): SubmoduleStatus {
  if (isSubmodule(sub)) {
    return parseSubmoduleToStatus(sub);
  }

  return {
    isSubmodule: false,
  };
}

function isSubmodule(sub: string): sub is SubmoduleString {
  return !!sub && sub.startsWith("S");
}

interface SubmoduleInfo {
  commitHasChanged: boolean;
  hasTrackedChanges: boolean;
  hasUntrackedChanges: boolean;
}

interface IsSubmodule extends SubmoduleInfo {
  isSubmodule: true;
}

interface IsNotSubmodule {
  isSubmodule: false;
}

export type SubmoduleStatus = IsSubmodule | IsNotSubmodule;

function parseSubmoduleToStatus(sub: SubmoduleString): IsSubmodule {
  return {
    isSubmodule: true,
    commitHasChanged: sub.charAt(1) === "C",
    hasTrackedChanges: sub.charAt(2) === "M",
    hasUntrackedChanges: sub.charAt(3) === "U",
  };
}
