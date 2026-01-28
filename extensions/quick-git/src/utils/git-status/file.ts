import type { SubmoduleString } from "./submodule.js";
import type { StatusValue } from "./changes.js";

export type FileStatus = ChangedFile | RenamedFile | UnmergedFile | UntrackedFile | IgnoredFile;

/**
 * Parse a line from Git Status Porcelain version 2 and return an object containing that information.
 */
export function parseFileStatus(line: string): FileStatus {
  const indicator = line.charAt(0) as LineIndicator;

  switch (indicator) {
    case "1":
      return parseChangedFile(line);
    case "2":
      return parseRenamedFile(line);
    case "u":
      return parseUnmergedFile(line);
    default: {
      const [, ...paths] = line.split(spaceRegex);
      const [path] = parsePaths(paths);
      return {
        indicator,
        path,
      };
    }
  }
}

/** Two character code indicating what the status of the file is in the index and working tree */
type XYStatus = `${StatusValue}${StatusValue}`;

/** 4 character code indicating the status of the submodule, `N...` indicates that it is not a submodule */
type SubmoduleStatus = SubmoduleString | "N...";

/**
 * The type of change that has occurred for this file and format the the line will take.
 * - `1` Ordinary changed entry
 * - `2` Renamed or copied entry
 * - `u` Unmerged entry
 * - `?` Untracked entry
 * - `!` Ignored entry
 */
type LineIndicator = "1" | "2" | "u" | "?" | "!";

/** All possible options that can be in a line. */
interface LineFormat {
  /** The type of line format that the change represents */
  indicator: LineIndicator;
  /** Status of the index and working tree */
  xy: XYStatus;
  /** Status of the git submodule */
  submodule: SubmoduleStatus;
  /** The octal file mode in HEAD */
  mH: string;
  /** The octal file mode in the index */
  mI: string;
  /** The octal file mode in the worktree */
  mW: string;
  /** The octal file mode in stage 1. */
  m1: string;
  /** The octal file mode in stage 2. */
  m2: string;
  /** The octal file mode in stage 3. */
  m3: string;
  /** The object name in HEAD */
  hH: string;
  /** The object name in the index */
  hI: string;
  /** The object name in stage 1. */
  h1: string;
  /** The object name in stage 2. */
  h2: string;
  /** The object name in stage 3. */
  h3: string;
  /** Rename or copy */
  rc: "R" | "C";
  /** Score denoting the percentage of similarity between the source and target of the move or copy */
  rcScore: number;
  /** The pathname. In a renamed/copied entry, this is the target path */
  path: string;
  /** The pathname in the commit at HEAD or in the index */
  origPath: string;
}

interface ChangedFile
  extends Pick<LineFormat, "indicator" | "xy" | "submodule" | "mH" | "mI" | "mW" | "hH" | "hI" | "path"> {
  indicator: "1";
}
interface RenamedFile
  extends Pick<
    LineFormat,
    "indicator" | "xy" | "submodule" | "mH" | "mI" | "mW" | "hH" | "hI" | "rc" | "rcScore" | "path" | "origPath"
  > {
  indicator: "2";
}
interface UnmergedFile
  extends Pick<LineFormat, "indicator" | "xy" | "submodule" | "m1" | "m2" | "m3" | "mW" | "h1" | "h2" | "h3" | "path"> {
  indicator: "u";
}
interface UntrackedFile extends Pick<LineFormat, "indicator" | "path"> {
  indicator: "?";
}
interface IgnoredFile extends Pick<LineFormat, "indicator" | "path"> {
  indicator: "!";
}

/** Match unescaped space characters, in case there are spaces in a filename */
const spaceRegex = /(?<!\\) /;

/**
 * Get the path name from an array of strings that come from splitting the original line apart.
 * @returns A tuple of the current path, and the original path in the case that the file was renamed.
 */
function parsePaths(strings: string[]): [string, string] {
  const rejoinedPaths = strings.join(" ");
  // in the case of a rename pathnames are separated by a tab character
  const [path, origPath] = rejoinedPaths.split(/\t/);
  return [path, origPath];
}

function parseChangedFile(line: string): ChangedFile {
  const [, xy, sub, mH, mI, mW, hH, hI, ...paths] = line.split(spaceRegex);
  const [path] = parsePaths(paths);

  return {
    indicator: "1",
    xy: xy as XYStatus,
    submodule: sub as SubmoduleStatus,
    mH,
    mI,
    mW,
    hH,
    hI,
    path,
  };
}

function parseRenamedFile(line: string): RenamedFile {
  const [, xy, sub, mH, mI, mW, hH, hI, xScore, ...paths] = line.split(spaceRegex);
  const rc = xScore.charAt(0) as "R" | "C";
  const score = +xScore.substring(1);
  const [path, origPath] = parsePaths(paths);

  return {
    indicator: "2",
    xy: xy as XYStatus,
    submodule: sub as SubmoduleStatus,
    mH,
    mI,
    mW,
    hH,
    hI,
    rc,
    rcScore: +score,
    path,
    origPath,
  };
}

function parseUnmergedFile(line: string): UnmergedFile {
  const [, xy, sub, m1, m2, m3, mW, h1, h2, h3, ...paths] = line.split(spaceRegex);
  const [path] = parsePaths(paths);

  return {
    indicator: "u",
    xy: xy as XYStatus,
    submodule: sub as SubmoduleStatus,
    m1,
    m2,
    m3,
    mW,
    h1,
    h2,
    h3,
    path,
  };
}
