import { describe, expect, it } from "vitest";
import { formatSessionTarget, parseIniSessions, parseRegistrySessions, toProtocol, toSessions } from "./parse";

describe("toProtocol", () => {
  it("defaults to sftp when WinSCP omits FSProtocol", () => {
    expect(toProtocol(undefined)).toBe("sftp");
    expect(toProtocol("")).toBe("sftp");
  });

  it("maps the FSProtocol enum", () => {
    expect(toProtocol("0")).toBe("scp");
    expect(toProtocol("2")).toBe("sftp");
    expect(toProtocol("5")).toBe("ftp");
    expect(toProtocol("6")).toBe("webdav");
    expect(toProtocol("7")).toBe("s3");
  });

  it("reads the hexadecimal form the registry uses", () => {
    expect(toProtocol("0x5")).toBe("ftp");
    expect(toProtocol("0x7")).toBe("s3");
  });

  it("falls back to sftp for unknown values", () => {
    expect(toProtocol("42")).toBe("sftp");
    expect(toProtocol("nonsense")).toBe("sftp");
  });
});

describe("parseIniSessions", () => {
  const ini = [
    "[Configuration]",
    "Version=6.5.4.0",
    "[Configuration\\Interface]",
    "HostName=not-a-session",
    "[Sessions\\My%20Site]",
    "HostName=example.com",
    "UserName=root",
    "PortNumber=2222",
    "[Sessions\\ftp-box]",
    "HostName=ftp.example.com",
    "UserName=anonymous",
    "FSProtocol=5",
    "[Sessions\\no-user]",
    "HostName=example.org",
    "UserName=",
    "[SshHostKeys]",
    "ssh-ed25519@22:example.com=abc",
  ].join("\r\n");

  it("only reads sections under [Sessions\\]", () => {
    expect(parseIniSessions(ini).map((session) => session.id)).toEqual(["My%20Site", "ftp-box", "no-user"]);
  });

  it("keeps the last session in the file", () => {
    expect(parseIniSessions("[Sessions\\only]\r\nHostName=example.com")).toEqual([
      { id: "only", hostName: "example.com" },
    ]);
  });

  it("reads the values of a session", () => {
    expect(parseIniSessions(ini)[1]).toEqual({
      id: "ftp-box",
      hostName: "ftp.example.com",
      userName: "anonymous",
      fsProtocol: "5",
    });
  });

  it("strips the encoded BOM from an INI section too, which WinSCP encodes like a registry key", () => {
    const sessions = toSessions(parseIniSessions("[Sessions\\%EF%BB%BFB%C3%BCro%20Nord]\r\nHostName=example.com"));
    expect(sessions[0]).toMatchObject({ id: "B%C3%BCro%20Nord", name: "Büro Nord" });
  });

  it("reads the IsWorkspace flag WinSCP writes on a workspace member", () => {
    const ini = "[Sessions\\Daily/0000]\r\nHostName=example.com\r\nIsWorkspace=1";
    expect(parseIniSessions(ini)[0].isWorkspace).toBe(true);
  });
});

describe("parseRegistrySessions", () => {
  it("reads each session, with FSProtocol arriving as a number", () => {
    const json = JSON.stringify([
      { id: "My%20Site", hostName: "example.com", userName: "root", fsProtocol: null },
      { id: "s3-bucket", hostName: "s3.amazonaws.com", userName: null, fsProtocol: 7 },
    ]);

    expect(parseRegistrySessions(json)).toEqual([
      { id: "My%20Site", hostName: "example.com", userName: "root", fsProtocol: undefined },
      { id: "s3-bucket", hostName: "s3.amazonaws.com", userName: undefined, fsProtocol: "7" },
    ]);
  });

  it("reads IsWorkspace, which the registry stores as a DWORD", () => {
    const json = JSON.stringify([
      { id: "Daily/0000", hostName: "example.com", isWorkspace: 1 },
      { id: "Prod/0000", hostName: "example.com", isWorkspace: null },
    ]);

    expect(parseRegistrySessions(json).map((session) => session.isWorkspace)).toEqual([true, undefined]);
  });

  it("accepts a lone session that ConvertTo-Json did not wrap in an array", () => {
    const json = JSON.stringify({ id: "only", hostName: "example.com", userName: null, fsProtocol: 5 });
    expect(parseRegistrySessions(json)).toEqual([
      { id: "only", hostName: "example.com", userName: undefined, fsProtocol: "5" },
    ]);
  });

  it("returns nothing when there are no sessions", () => {
    expect(parseRegistrySessions("[]")).toEqual([]);
    expect(parseRegistrySessions("")).toEqual([]);
    expect(parseRegistrySessions("\r\n")).toEqual([]);
  });
});

describe("toSessions", () => {
  it("keeps the stored id and decodes the name", () => {
    expect(toSessions([{ id: "My%20Site", hostName: "example.com" }])[0]).toMatchObject({
      id: "My%20Site",
      name: "My Site",
    });
  });

  it("strips the encoded BOM WinSCP puts in front of a non-ASCII name", () => {
    // WinSCP stores a session named "Büro Nord" under this key.
    expect(toSessions([{ id: "%EF%BB%BFB%C3%BCro%20Nord", hostName: "example.com" }])[0]).toMatchObject({
      // WinSCP.exe rejects the BOM, so it must not reach the command line.
      id: "B%C3%BCro%20Nord",
      name: "Büro Nord",
    });
  });

  it("does not put the BOM character into the display name", () => {
    const [session] = toSessions([{ id: "%EF%BB%BFM%C3%BCller", hostName: "example.com" }]);
    expect(session.name).toBe("Müller");
    expect(session.name.startsWith("\uFEFF")).toBe(false);
  });

  it("keeps a name that is not valid percent encoding as-is", () => {
    expect(toSessions([{ id: "100%-done", hostName: "example.com" }])[0]).toMatchObject({
      id: "100%-done",
      name: "100%-done",
    });
  });

  it("treats a missing or empty UserName as no user", () => {
    const sessions = toSessions([
      { id: "a", hostName: "example.com" },
      { id: "b", hostName: "example.com", userName: "" },
    ]);
    expect(sessions.map((session) => session.user)).toEqual([undefined, undefined]);
  });

  it("skips WinSCP's Default Settings template", () => {
    const sessions = toSessions([
      { id: "Default%20Settings", userName: "root" },
      { id: "real", hostName: "example.com" },
    ]);
    expect(sessions.map((session) => session.id)).toEqual(["real"]);
  });

  it("skips sessions without a host", () => {
    expect(toSessions([{ id: "broken", userName: "root" }])).toEqual([]);
  });

  it("collapses the members of a workspace into one entry", () => {
    const sessions = toSessions([
      { id: "My%20Workspace/0000", hostName: "one.example.com", isWorkspace: true },
      { id: "My%20Workspace/0001", hostName: "two.example.com", isWorkspace: true },
      { id: "Media/0000", hostName: "three.example.com", isWorkspace: true },
    ]);

    expect(sessions).toEqual([
      {
        id: "My%20Workspace",
        name: "My Workspace",
        protocol: "sftp",
        isWorkspace: true,
        sessionCount: 2,
      },
      { id: "Media", name: "Media", protocol: "sftp", isWorkspace: true, sessionCount: 1 },
    ]);
  });

  it("does not mistake a session inside a folder for a workspace", () => {
    expect(toSessions([{ id: "prod/web", hostName: "example.com" }])[0]).toMatchObject({
      id: "prod/web",
      name: "prod/web",
      isWorkspace: false,
    });
  });

  // A workspace member is named after its index, so a foldered session named like one is only
  // distinguishable by the flag WinSCP stores on it.
  it("keeps a foldered session whose name looks like a workspace member", () => {
    expect(toSessions([{ id: "Prod/0000", hostName: "example.com", userName: "root" }])).toEqual([
      {
        id: "Prod/0000",
        name: "Prod/0000",
        protocol: "sftp",
        host: "example.com",
        user: "root",
        isWorkspace: false,
      },
    ]);
  });
});

describe("formatSessionTarget", () => {
  const session = { id: "a", name: "a", protocol: "sftp", isWorkspace: false } as const;

  it("omits the user when there is none", () => {
    expect(formatSessionTarget({ ...session, host: "example.com" })).toBe("sftp://example.com");
  });

  it("includes the user when there is one", () => {
    expect(formatSessionTarget({ ...session, host: "example.com", user: "root" })).toBe("sftp://root@example.com");
  });

  it("describes a workspace by its size", () => {
    expect(formatSessionTarget({ id: "w", name: "w", protocol: "sftp", isWorkspace: true, sessionCount: 1 })).toBe(
      "Workspace · 1 session",
    );
    expect(formatSessionTarget({ id: "w", name: "w", protocol: "sftp", isWorkspace: true, sessionCount: 3 })).toBe(
      "Workspace · 3 sessions",
    );
  });
});
