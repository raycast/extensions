// Parsers for `/usr/bin/lsappinfo` output (a system binary, no permissions): the running instances of a bundle ID.
// Needed because the window helper lists only apps that have windows, while a tracked app such as Discord or Mail can
// be running with none (owner report, 2026-09-30). Pure, so it is unit-tested; the spawn lives in src/running.ts.

/** `lsappinfo find bundleID=<id>` prints every match on one line: `ASN:0x0-0x21021-"Discord": ASN:0x0-0x2202-…`. */
export function parseAsns(text: string): string[] {
  return [...text.matchAll(/ASN:0x[0-9a-f]+-0x[0-9a-f]+/gi)].map((m) => m[0]);
}

/** `lsappinfo info -only pid <ASN>` prints a block containing `pid = 714 …`. */
export function parsePid(text: string): number | undefined {
  const m = /\bpid = (\d+)/.exec(text);
  return m ? Number(m[1]) : undefined;
}
