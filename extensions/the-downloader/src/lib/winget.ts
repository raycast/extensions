/**
 * Reading winget's text tables. `winget list` and `winget upgrade` have no
 * machine-readable output, so a package's row is found by its Id and the cells
 * after the Id are read in order: Version, Available (only when an upgrade
 * exists), Source. Versions are taken as printed: yt-dlp's FFmpeg build is
 * versioned `N-127043-g5a54fcf75e-20260930`, which a dotted-number match misses.
 */

/**
 * winget's NO_APPLICATIONS_FOUND exit code (0x8A150014): `winget list --id X`
 * when X isn't installed. Node reports Windows exit codes unsigned, winget's docs
 * (and `$LASTEXITCODE`) signed — accept both.
 */
const WINGET_NO_APPLICATIONS_FOUND_CODES = new Set([2316632084, -1978335212]);

/** True when a `winget list` exit code means "no such package installed". */
export function isWingetNotInstalled(exitCode: number | undefined): boolean {
  return exitCode !== undefined && WINGET_NO_APPLICATIONS_FOUND_CODES.has(exitCode);
}

/** Source names winget prints in the last column. */
const SOURCES = new Set(["winget", "msstore"]);

export type WingetRow = { version: string; available?: string };

/** winget prints an approximate version as `< 1.2` or `> 1.2`: keep the sign with its number. */
function joinComparators(cells: string[]): string[] {
  const joined: string[] = [];
  for (let i = 0; i < cells.length; i++) {
    if ((cells[i] === "<" || cells[i] === ">") && i + 1 < cells.length) {
      joined.push(`${cells[i]} ${cells[i + 1]}`);
      i++;
    } else {
      joined.push(cells[i]);
    }
  }
  return joined;
}

/** The row for package `id` in winget's `list` or `upgrade` output, or undefined when it isn't listed. */
export function wingetRow(output: string, id: string): WingetRow | undefined {
  const wanted = id.toLowerCase();
  for (const line of output.split(/\r?\n/)) {
    // Names can contain spaces, Ids can't: everything after the Id is one cell per word.
    const words = line.trim().split(/\s+/);
    const at = words.findIndex((word) => word.toLowerCase() === wanted);
    if (at === -1) continue;
    const [version, second, third] = joinComparators(words.slice(at + 1));
    if (!version) continue;
    // Available sits between Version and Source, so two cells after Version
    // mean it's there; one cell is it only when that cell isn't a source name.
    const available = third !== undefined || (second !== undefined && !SOURCES.has(second)) ? second : undefined;
    return { version, available };
  }
  return undefined;
}
