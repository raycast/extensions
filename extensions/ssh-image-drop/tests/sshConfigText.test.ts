import { describe, expect, it } from "vitest";
import {
  ensureIncludeContent,
  INCLUDE_LINE,
  parseHostAliases,
  parseManagedEntry,
  removeManagedBlock,
  upsertManagedBlock,
} from "../src/lib/sshConfigText";

const SAMPLE = `
# comment
Host server.example.com
  User deploy

host dev1 dev2
	HostName 192.0.2.5

Host *.example.com
Host !bad.example.com
Host *
`;

describe("parseHostAliases", () => {
  it("extracts aliases, case-insensitive keyword, multi-alias, tab separators", () => {
    expect(parseHostAliases(SAMPLE)).toEqual([
      "server.example.com",
      "dev1",
      "dev2",
    ]);
  });
  it("skips wildcard and negation patterns", () => {
    expect(parseHostAliases("Host *\nHost a?b\nHost !x\nHost ok")).toEqual([
      "ok",
    ]);
  });
  it("strips inline comments", () => {
    expect(parseHostAliases("Host foo # production server")).toEqual(["foo"]);
  });
  it("returns empty for empty content", () => {
    expect(parseHostAliases("")).toEqual([]);
  });
});

describe("upsertManagedBlock / removeManagedBlock", () => {
  const entry = {
    alias: "mm",
    hostName: "server.example.com",
    user: "deploy",
    port: "22",
    identityFile: "~/.ssh/ssh_image_drop_ed25519",
  };
  it("writes a marked block with IdentityFile and IdentitiesOnly", () => {
    const out = upsertManagedBlock("", entry);
    expect(out).toContain("# >>> ssh-image-drop: mm");
    expect(out).toContain("Host mm");
    expect(out).toContain("  HostName server.example.com");
    expect(out).toContain("  User deploy");
    expect(out).toContain("  Port 22");
    expect(out).toContain("  IdentityFile ~/.ssh/ssh_image_drop_ed25519");
    expect(out).toContain("  IdentitiesOnly yes");
    expect(out).toContain("# <<< ssh-image-drop: mm");
  });
  it("omits IdentityFile lines for keychain-mode entries", () => {
    const out = upsertManagedBlock("", { ...entry, identityFile: undefined });
    expect(out).not.toContain("IdentityFile");
    expect(out).not.toContain("IdentitiesOnly");
  });
  it("is idempotent — re-upsert replaces the existing block", () => {
    const once = upsertManagedBlock("", entry);
    const twice = upsertManagedBlock(once, { ...entry, port: "2222" });
    expect(twice.match(/# >>> ssh-image-drop: mm/g)).toHaveLength(1);
    expect(twice).toContain("  Port 2222");
    expect(twice).not.toContain("  Port 22\n");
  });
  it("remove deletes only the target block and parses back", () => {
    const two = upsertManagedBlock(upsertManagedBlock("", entry), {
      alias: "ect",
      hostName: "other.example.com",
      user: "deploy",
      port: "22",
    });
    const left = removeManagedBlock(two, "mm");
    expect(left).not.toContain("Host mm");
    expect(parseHostAliases(left)).toEqual(["ect"]);
    expect(removeManagedBlock(left, "ect").trim()).toBe("");
  });
});

describe("parseManagedEntry", () => {
  const entry = {
    alias: "mm",
    hostName: "server.example.com",
    user: "deploy",
    port: "2222",
    identityFile: "~/.ssh/ssh_image_drop_ed25519",
  };
  it("round-trips a key-mode block back to its entry", () => {
    const content = upsertManagedBlock("", entry);
    expect(parseManagedEntry(content, "mm")).toEqual(entry);
  });
  it("parses a keychain-mode block (no IdentityFile)", () => {
    const km = { ...entry, identityFile: undefined };
    const content = upsertManagedBlock("", km);
    expect(parseManagedEntry(content, "mm")).toEqual({
      ...km,
      identityFile: undefined,
    });
  });
  it("returns null when the alias block is absent", () => {
    const content = upsertManagedBlock("", entry);
    expect(parseManagedEntry(content, "nope")).toBeNull();
  });
  it("picks the target block among several", () => {
    const two = upsertManagedBlock(upsertManagedBlock("", entry), {
      alias: "ect",
      hostName: "other.example.com",
      user: "root",
      port: "40022",
    });
    expect(parseManagedEntry(two, "ect")).toEqual({
      alias: "ect",
      hostName: "other.example.com",
      user: "root",
      port: "40022",
      identityFile: undefined,
    });
  });
  it("returns null when the block is missing a required field", () => {
    // begin marker present but no Port — the corrupted-config case Edit falls back on
    const content =
      "# >>> ssh-image-drop: mm\nHost mm\n  HostName h.example.com\n  User u\n# <<< ssh-image-drop: mm\n";
    expect(parseManagedEntry(content, "mm")).toBeNull();
  });
  it("parses to EOF when the end marker is missing (lenient)", () => {
    const content =
      "# >>> ssh-image-drop: mm\nHost mm\n  HostName h.example.com\n  User u\n  Port 22\n";
    expect(parseManagedEntry(content, "mm")).toEqual({
      alias: "mm",
      hostName: "h.example.com",
      user: "u",
      port: "22",
      identityFile: undefined,
    });
  });
});

describe("ensureIncludeContent", () => {
  it("prepends the include line once", () => {
    const r = ensureIncludeContent("Host a\n");
    expect(r.changed).toBe(true);
    expect(r.content.startsWith(INCLUDE_LINE)).toBe(true);
    const again = ensureIncludeContent(r.content);
    expect(again.changed).toBe(false);
    expect(again.content).toBe(r.content);
  });
});
