// src/lib/cli-auth.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadCliAuth, getAuthFilePath, getAuthCommand } from "./cli-auth";

let tempDir: string;
const originalEnv = process.env.NITESHIFT_CONFIG_HOME;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "niteshift-test-"));
  process.env.NITESHIFT_CONFIG_HOME = tempDir;
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalEnv === undefined) {
    delete process.env.NITESHIFT_CONFIG_HOME;
  } else {
    process.env.NITESHIFT_CONFIG_HOME = originalEnv;
  }
});

function writeAuthFile(filename: string, contents: unknown) {
  fs.writeFileSync(path.join(tempDir, filename), JSON.stringify(contents));
}

const futureIso = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
const pastIso = new Date(Date.now() - 1000).toISOString();

describe("loadCliAuth", () => {
  it("returns null when the file does not exist", () => {
    expect(loadCliAuth("prod")).toBeNull();
  });

  it("loads the prod profile from cli-auth.json for prod env", () => {
    writeAuthFile("cli-auth.json", {
      version: "2",
      profiles: {
        prod: {
          token: "tok-prod",
          userId: "u1",
          email: "p@p",
          authenticatedAt: futureIso,
          expiresAt: futureIso,
        },
      },
    });
    const auth = loadCliAuth("prod");
    expect(auth?.token).toBe("tok-prod");
    expect(auth?.email).toBe("p@p");
    expect(auth?.expiresAt).toBeInstanceOf(Date);
  });

  it("loads the dev profile from cli-auth-dev.json for dev env", () => {
    writeAuthFile("cli-auth-dev.json", {
      version: "2",
      profiles: {
        dev: {
          token: "tok-dev",
          userId: "u1",
          email: "d@d",
          authenticatedAt: futureIso,
          expiresAt: futureIso,
        },
      },
    });
    expect(loadCliAuth("dev")?.token).toBe("tok-dev");
  });

  it("loads the prod profile from cli-auth-staging.json for staging env (CLI quirk)", () => {
    writeAuthFile("cli-auth-staging.json", {
      version: "2",
      profiles: {
        prod: {
          token: "tok-staging",
          userId: "u1",
          email: "s@s",
          authenticatedAt: futureIso,
          expiresAt: futureIso,
        },
      },
    });
    expect(loadCliAuth("staging")?.token).toBe("tok-staging");
  });

  it("returns null when the wrong profile key is present in the file", () => {
    writeAuthFile("cli-auth.json", {
      version: "2",
      profiles: {
        dev: {
          token: "wrong",
          userId: "u1",
          email: "x@x",
          authenticatedAt: futureIso,
          expiresAt: futureIso,
        },
      },
    });
    expect(loadCliAuth("prod")).toBeNull();
  });

  it("returns null when the file's version is not 2", () => {
    writeAuthFile("cli-auth.json", { version: "1", profiles: {} });
    expect(loadCliAuth("prod")).toBeNull();
  });

  it("returns null when the file is corrupted JSON", () => {
    fs.writeFileSync(path.join(tempDir, "cli-auth.json"), "{not valid json");
    expect(loadCliAuth("prod")).toBeNull();
  });

  it("returns null when the token has expired", () => {
    writeAuthFile("cli-auth.json", {
      version: "2",
      profiles: {
        prod: {
          token: "expired",
          userId: "u1",
          email: "x@x",
          authenticatedAt: pastIso,
          expiresAt: pastIso,
        },
      },
    });
    expect(loadCliAuth("prod")).toBeNull();
  });

  it("returns null when the token is not a string", () => {
    writeAuthFile("cli-auth.json", {
      version: "2",
      profiles: {
        prod: {
          token: 12345 as unknown as string,
          userId: "u1",
          email: "x@x",
          authenticatedAt: futureIso,
          expiresAt: futureIso,
        },
      },
    });
    expect(loadCliAuth("prod")).toBeNull();
  });

  it("returns null when the email is not a string", () => {
    writeAuthFile("cli-auth.json", {
      version: "2",
      profiles: {
        prod: {
          token: "ok",
          userId: "u1",
          email: ["not", "a", "string"] as unknown as string,
          authenticatedAt: futureIso,
          expiresAt: futureIso,
        },
      },
    });
    expect(loadCliAuth("prod")).toBeNull();
  });
});

describe("getAuthFilePath", () => {
  it("returns the prod path for prod env", () => {
    expect(getAuthFilePath("prod")).toBe(path.join(tempDir, "cli-auth.json"));
  });
  it("returns the dev path for dev env", () => {
    expect(getAuthFilePath("dev")).toBe(path.join(tempDir, "cli-auth-dev.json"));
  });
  it("returns the staging path for staging env", () => {
    expect(getAuthFilePath("staging")).toBe(path.join(tempDir, "cli-auth-staging.json"));
  });
});

describe("getAuthCommand", () => {
  it("returns 'niteshift auth' for prod", () => {
    expect(getAuthCommand("prod")).toBe("niteshift auth");
  });
  it("returns 'niteshift --env staging auth' for staging", () => {
    expect(getAuthCommand("staging")).toBe("niteshift --env staging auth");
  });
  it("returns 'niteshift --env dev auth' for dev", () => {
    expect(getAuthCommand("dev")).toBe("niteshift --env dev auth");
  });
});
