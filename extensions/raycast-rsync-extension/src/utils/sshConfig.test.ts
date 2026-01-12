import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";

// Type definitions for mocked fs module
type MockedFS = typeof fs & {
  __setMockFileContent: (content: string) => void;
  __setMockFileExists: (exists: boolean) => void;
  __setMockPermissionError: (shouldThrow: boolean) => void;
};

// Mock modules before importing the module under test
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof os>("node:os");
  return {
    ...actual,
    homedir: vi.fn(() => "/mock/home"),
  };
});

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof fs>("node:fs");
  let mockFileContent = "";
  let mockFileExists = false;
  let mockThrowPermissionError = false;

  return {
    ...actual,
    existsSync: vi.fn(() => mockFileExists),
    readFileSync: vi.fn(() => {
      if (mockThrowPermissionError) {
        const error: NodeJS.ErrnoException = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      }
      return mockFileContent;
    }),
    __setMockFileContent: (content: string) => {
      mockFileContent = content;
      mockFileExists = true;
    },
    __setMockFileExists: (exists: boolean) => {
      mockFileExists = exists;
    },
    __setMockPermissionError: (shouldThrow: boolean) => {
      mockThrowPermissionError = shouldThrow;
    },
  };
});

import { parseSSHConfig, getHostConfig } from "./sshConfig";

describe("SSH Config Parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs as unknown as MockedFS).__setMockFileExists(false);
    (fs as unknown as MockedFS).__setMockPermissionError(false);
  });

  it("should parse valid config with single host", () => {
    const config = `
Host server1
  HostName example.com
  User admin
  Port 2222
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const hosts = parseSSHConfig();
    expect(hosts).toHaveLength(1);
    expect(hosts[0]).toEqual({
      host: "server1",
      hostName: "example.com",
      user: "admin",
      port: 2222,
      identityFile: undefined,
      proxyJump: undefined,
    });
  });

  it("should parse config with multiple hosts", () => {
    const config = `
Host server1
  HostName example.com
  User admin

Host server2
  HostName test.com
  User root
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const hosts = parseSSHConfig();
    expect(hosts).toHaveLength(2);
    expect(hosts[0].host).toBe("server1");
    expect(hosts[1].host).toBe("server2");
  });

  it("should handle multiple aliases per host", () => {
    const config = `
Host server1 srv1 s1
  HostName example.com
  User admin
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const hosts = parseSSHConfig();
    expect(hosts).toHaveLength(3);
    expect(hosts[0].host).toBe("server1");
    expect(hosts[1].host).toBe("srv1");
    expect(hosts[2].host).toBe("s1");
    expect(hosts[0].hostName).toBe("example.com");
    expect(hosts[1].hostName).toBe("example.com");
    expect(hosts[2].hostName).toBe("example.com");
  });

  it("should filter out wildcard hosts", () => {
    const config = `
Host *
  User default

Host server1
  HostName example.com
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const hosts = parseSSHConfig();
    expect(hosts).toHaveLength(1);
    expect(hosts[0].host).toBe("server1");
  });

  it("should handle comments and empty lines", () => {
    const config = `
# This is a comment
Host server1
  # Another comment
  HostName example.com
  
  User admin
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const hosts = parseSSHConfig();
    expect(hosts).toHaveLength(1);
    expect(hosts[0].hostName).toBe("example.com");
    expect(hosts[0].user).toBe("admin");
  });

  it("should throw error for missing config file", () => {
    (fs as unknown as MockedFS).__setMockFileExists(false);
    expect(() => parseSSHConfig()).toThrow("SSH config file not found");
  });

  it("should find specific host by alias", () => {
    const config = `
Host server1
  HostName example.com
  User admin

Host server2
  HostName test.com
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const host = getHostConfig("server1");
    expect(host).not.toBeNull();
    expect(host?.host).toBe("server1");
    expect(host?.hostName).toBe("example.com");
  });

  it("should return null for non-existent host", () => {
    const config = `
Host server1
  HostName example.com
`;
    (fs as unknown as MockedFS).__setMockFileContent(config);

    const host = getHostConfig("nonexistent");
    expect(host).toBeNull();
  });
});
