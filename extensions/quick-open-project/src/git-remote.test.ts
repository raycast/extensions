import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGitRemote } from "./git-remote";

describe("parseGitRemote", () => {
  const browserUrlCases = [
    ["https://github.com/owner/project.git", "https://github.com/owner/project"],
    ["git@github.com:owner/project.git", "https://github.com/owner/project"],
    ["https://gitlab.example.com/group/subgroup/project.git", "https://gitlab.example.com/group/subgroup/project"],
    ["git@gitlab.example.com:group/subgroup/project.git", "https://gitlab.example.com/group/subgroup/project"],
    ["ssh://git@gitlab.example.com/group/subgroup/project.git", "https://gitlab.example.com/group/subgroup/project"],
    ["git+ssh://git@host.example.com/group/project.git", "https://host.example.com/group/project"],
    ["git@ssh.dev.azure.com:v3/org/project/repository", "https://ssh.dev.azure.com/v3/org/project/repository"],
  ] as const;
  for (const [remoteUrl, expectedUrl] of browserUrlCases) {
    it(`converts ${remoteUrl} to a browser URL`, () => {
      assert.equal(parseGitRemote(remoteUrl)?.url, expectedUrl);
    });
  }

  const webTransportCases = [
    ["http://host.example.com:8080/group/project.git", "http://host.example.com:8080/group/project"],
    ["https://host.example.com:8443/group/project.git", "https://host.example.com:8443/group/project"],
    ["git+https://host.example.com:8443/group/project.git", "https://host.example.com:8443/group/project"],
  ] as const;
  for (const [remoteUrl, expectedUrl] of webTransportCases) {
    it(`preserves the HTTP transport and web port for ${remoteUrl}`, () => {
      assert.equal(parseGitRemote(remoteUrl)?.url, expectedUrl);
    });
  }

  const clonePortCases = [
    ["ssh://git@host.example.com:2222/group/project.git", "https://host.example.com/group/project"],
    ["git://host.example.com:9418/group/project.git", "https://host.example.com/group/project"],
    ["git+ssh://git@host.example.com:2222/group/project.git", "https://host.example.com/group/project"],
  ] as const;
  for (const [remoteUrl, expectedUrl] of clonePortCases) {
    it(`drops the clone-service port for ${remoteUrl}`, () => {
      assert.equal(parseGitRemote(remoteUrl)?.url, expectedUrl);
    });
  }

  it("removes credentials, query parameters, fragments, and a case-insensitive .git suffix", () => {
    assert.deepEqual(parseGitRemote("https://user:password@github.com/owner/project.GIT/?ref=test#readme"), {
      host: "github.com",
      url: "https://github.com/owner/project",
    });
  });

  const rejectedRemotes = [
    "/local/repository",
    "../relative/repository",
    "C:\\local\\repository",
    "\\\\server\\share\\repo",
    "file:///local/repository",
    "ftp://host.example.com/group/project.git",
    "ext::command arg",
    "not a URL",
  ] as const;
  for (const remoteUrl of rejectedRemotes) {
    it(`rejects non-browser remote ${remoteUrl}`, () => {
      assert.equal(parseGitRemote(remoteUrl), undefined);
    });
  }
});
