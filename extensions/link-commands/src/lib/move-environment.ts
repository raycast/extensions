import { subtitleFormOf } from "./convention";
import { HEADER_SCAN_LINES } from "./parse-script-command";

/**
 * One header line, split into what is kept and what is replaced. The prefix carries the file's own comment
 * marker and spacing (`# `, `// `, `-- `), so the rewritten line reads as if its author had typed it. The
 * lookahead stops `@raycast.title` from also matching a longer key that happens to start with it.
 */
const headerLine = (key: string) => new RegExp(`^(.*@raycast\\.${key}(?![A-Za-z0-9])[ \\t]*)(.*?)(\\r?)$`);

const TITLE_LINE = headerLine("title");
const PACKAGE_LINE = headerLine("packageName");

/**
 * Moves a command's environment from its title to its subtitle, in the file's own text. Only the
 * `@raycast.title` and `@raycast.packageName` lines change; every other byte — body, icon, arguments, blank
 * lines, line endings — is left as it was, because this edits a script the user wrote and owns, not one this
 * extension is regenerating. The first occurrence of each key is the one rewritten, since that is the one
 * Raycast and the parser read.
 *
 * A command with no subtitle gets one, placed straight after the title so the pair stays together. Returns
 * the contents unchanged when the title carries no environment, which is also what makes a second run a
 * no-op rather than a second rewrite.
 */
export const moveEnvironmentToSubtitle = (contents: string) => {
  const lines = contents.split("\n");
  const header = lines.slice(0, HEADER_SCAN_LINES);

  const titleIndex = header.findIndex((line) => TITLE_LINE.test(line));
  if (titleIndex < 0) return contents;

  const packageIndex = header.findIndex((line) => PACKAGE_LINE.test(line));
  const titleMatch = lines[titleIndex].match(TITLE_LINE);
  const packageMatch = packageIndex < 0 ? undefined : lines[packageIndex].match(PACKAGE_LINE);
  if (!titleMatch) return contents;

  const moved = subtitleFormOf({ title: titleMatch[2].trim(), packageName: packageMatch?.[2].trim() });
  if (!moved) return contents;

  const [, titlePrefix, , lineEnding] = titleMatch;
  lines[titleIndex] = `${titlePrefix}${moved.title}${lineEnding}`;

  if (packageMatch) {
    lines[packageIndex] = `${packageMatch[1]}${moved.packageName}${packageMatch[3]}`;
  } else {
    const commentMarker = titlePrefix.slice(0, titlePrefix.indexOf("@raycast."));
    lines.splice(titleIndex + 1, 0, `${commentMarker}@raycast.packageName ${moved.packageName}${lineEnding}`);
  }

  return lines.join("\n");
};
