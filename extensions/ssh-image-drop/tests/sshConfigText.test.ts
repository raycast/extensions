import { describe, expect, it } from "vitest";
import {
  ensureIncludeContent,
  INCLUDE_LINE,
  parseHostAliases,
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
