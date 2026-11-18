import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_MESSAGES } from "../../src/constants";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import {
  buildSecurePropertiesArgs,
  cleanEncryptedText,
  getJavaExecutableCandidates,
  runSecurePropertiesOperation,
  runSecurePropertiesTool,
} from "../../src/utils";

const mockedExecFile = vi.mocked(execFile);

function mockExecSuccess(stdout: string, assertArgs?: (args: readonly string[]) => void) {
  mockedExecFile.mockImplementation(((
    _file: string,
    args: readonly string[],
    _options: unknown,
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    assertArgs?.(args);
    callback(null, stdout, "");
    return {} as never;
  }) as unknown as typeof execFile);
}

function mockExecFailure(error: Error) {
  mockedExecFile.mockImplementation(((
    _file: string,
    _args: readonly string[],
    _options: unknown,
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(error, "", "");
    return {} as never;
  }) as unknown as typeof execFile);
}

describe("cleanEncryptedText", () => {
  it("strips the Mule ![...] wrapper", () => {
    expect(cleanEncryptedText("![abc123==]")).toBe("abc123==");
  });

  it("trims whitespace before checking the wrapper", () => {
    expect(cleanEncryptedText("  ![payload]  ")).toBe("payload");
  });

  it("returns trimmed text when no wrapper is present", () => {
    expect(cleanEncryptedText("  plain-cipher  ")).toBe("plain-cipher");
  });

  it("leaves incomplete wrappers untouched", () => {
    expect(cleanEncryptedText("![missing-end")).toBe("![missing-end");
    expect(cleanEncryptedText("missing-start]")).toBe("missing-start]");
  });
});

describe("buildSecurePropertiesArgs", () => {
  it("builds encrypt args without random IV", () => {
    expect(
      buildSecurePropertiesArgs({
        operation: "encrypt",
        input: "secret",
        password: "key",
        algorithm: "AES",
        mode: "CBC",
      }),
    ).toEqual(["string", "encrypt", "AES", "CBC", "key", "secret"]);
  });

  it("appends --use-random-iv when encrypting with random IV", () => {
    expect(
      buildSecurePropertiesArgs({
        operation: "encrypt",
        input: "secret",
        password: "key",
        algorithm: "AES",
        mode: "CBC",
        useRandomIV: true,
      }),
    ).toEqual(["string", "encrypt", "AES", "CBC", "key", "secret", "--use-random-iv"]);
  });

  it("appends --use-random-iv for decrypt when requested", () => {
    expect(
      buildSecurePropertiesArgs({
        operation: "decrypt",
        input: "cipher",
        password: "key",
        algorithm: "AES",
        mode: "CBC",
        useRandomIV: true,
      }),
    ).toEqual(["string", "decrypt", "AES", "CBC", "key", "cipher", "--use-random-iv"]);
  });

  it("ignores random IV for ECB mode", () => {
    expect(
      buildSecurePropertiesArgs({
        operation: "encrypt",
        input: "secret",
        password: "key",
        algorithm: "AES",
        mode: "ECB",
        useRandomIV: true,
      }),
    ).toEqual(["string", "encrypt", "AES", "ECB", "key", "secret"]);
  });

  it("keeps special characters as discrete argv entries", () => {
    const args = buildSecurePropertiesArgs({
      operation: "encrypt",
      input: 'value with "quotes"',
      password: "p@ss word",
      algorithm: "Blowfish",
      mode: "CBC",
    });

    expect(args.at(-2)).toBe("p@ss word");
    expect(args.at(-1)).toBe('value with "quotes"');
  });
});

describe("runSecurePropertiesTool", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it("invokes java with the jar classpath and returns trimmed stdout", async () => {
    mockExecSuccess("  RESULT  \n");

    await expect(runSecurePropertiesTool(["string", "encrypt", "AES", "CBC", "key", "secret"])).resolves.toBe("RESULT");

    expect(mockedExecFile).toHaveBeenCalledWith(
      expect.stringMatching(/java$/),
      expect.arrayContaining(["-cp", expect.any(String), "com.mulesoft.tools.SecurePropertiesTool"]),
      expect.objectContaining({ cwd: expect.any(String), encoding: "utf8" }),
      expect.any(Function),
    );
  });

  it("maps missing java binaries to a friendly error", async () => {
    mockExecFailure(Object.assign(new Error("spawn java ENOENT"), { code: "ENOENT" }));

    await expect(runSecurePropertiesTool(["string", "encrypt", "AES", "CBC", "key", "secret"])).rejects.toThrow(
      ERROR_MESSAGES.JAVA_MISSING,
    );
  });

  it("maps plain java-not-found messages to a friendly error", async () => {
    mockExecFailure(new Error("java: command not found"));

    await expect(runSecurePropertiesTool(["string", "encrypt", "AES", "CBC", "key", "secret"])).rejects.toThrow(
      ERROR_MESSAGES.JAVA_MISSING,
    );
  });

  it("rethrows unexpected tool failures", async () => {
    mockExecFailure(new Error("cipher failure"));

    await expect(runSecurePropertiesTool(["string", "encrypt", "AES", "CBC", "key", "secret"])).rejects.toThrow(
      "cipher failure",
    );
  });

  it("redacts the password and input from tool errors", async () => {
    mockExecFailure(new Error("Command failed: java string encrypt AES CBC my-password my-plaintext"));

    await expect(
      runSecurePropertiesTool(["string", "encrypt", "AES", "CBC", "my-password", "my-plaintext"]),
    ).rejects.not.toThrow(/my-password|my-plaintext/);
  });
});

describe("getJavaExecutableCandidates", () => {
  it("checks JAVA_HOME and common macOS installations before PATH", () => {
    expect(getJavaExecutableCandidates("/custom/jdk")).toEqual([
      "/custom/jdk/bin/java",
      "/usr/bin/java",
      "/opt/homebrew/opt/openjdk/bin/java",
      "java",
    ]);
  });
});

describe("runSecurePropertiesOperation", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it("builds args then executes the tool", async () => {
    mockExecSuccess("cipher-text", (args) => {
      expect(args).toEqual([
        "-cp",
        expect.any(String),
        "com.mulesoft.tools.SecurePropertiesTool",
        "string",
        "encrypt",
        "AES",
        "CBC",
        "key",
        "secret",
        "--use-random-iv",
      ]);
    });

    await expect(
      runSecurePropertiesOperation({
        operation: "encrypt",
        input: "secret",
        password: "key",
        algorithm: "AES",
        mode: "CBC",
        useRandomIV: true,
      }),
    ).resolves.toBe("cipher-text");
  });
});
