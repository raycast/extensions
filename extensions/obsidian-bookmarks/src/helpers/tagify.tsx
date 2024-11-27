import isNotNull from "./is-not-null";

export default function tagify(string: string | undefined): string[] {
  if (string == null) return [];

  return string
    .normalize()
    .trim()
    .split(/[,\s]+/)
    .flatMap((value) => {
      let tag = value;
      if (value.length === 0) return undefined;

      // Go ahead and strip any "#" from the front of the tag.
      // We don't use them in the canonically stored version.
      tag = tag.replace(/^#+/, "");

      // Rules for tags:
      // https://help.obsidian.md/How+to/Working+with+tags
      //
      // 1. Tags may contain: letters, numbers, underscores (_), and dashes (-).
      // 2. Tags may contain forward slashes (/) for nested tags
      tag = tag.replace(/[^A-Za-z0-9_/-]/gi, "");

      // 3. Tags may not be *entirely* numeric.
      // We don't want to throw an error, though. So make this undefined.
      // Callers will need to correctly interpret what undefined means.
      if (/^\d+$/.test(tag)) return undefined;

      return tag;
    })
    .filter(isNotNull);
}
