import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClipboardManagerItem } from "bettertouchtool";
import {
  formatClipboardItemDate,
  getClipboardItemColor,
  getClipboardItemFilePath,
  getClipboardItemShellCommand,
  getClipboardItemText,
  getClipboardItemTitle,
  getClipboardItemUrl,
  parseClipboardCommandWhitelist,
} from "./clipboard-utils";

function clipboardItem(content: unknown, previewText?: string): ClipboardManagerItem {
  return { meta: { uuid: "item", previewText }, content };
}

describe("BTT clipboard item formatting", () => {
  it("uses full text content for copying and the metadata preview for display", () => {
    const item = clipboardItem("Full clipboard content", "Full preview");
    assert.equal(getClipboardItemText(item), "Full clipboard content");
    assert.equal(getClipboardItemTitle(item), "Full preview");
  });

  it("collapses whitespace, truncates previews, and labels non-text items", () => {
    assert.equal(getClipboardItemTitle(clipboardItem("first\n  second")), "first second");
    assert.equal(getClipboardItemTitle(clipboardItem("123456789"), 6), "12345…");
    assert.equal(getClipboardItemTitle(clipboardItem({ image: true })), "Non-text clipboard item");
    assert.equal(getClipboardItemText(clipboardItem({ image: true }, "Image preview")), "");
  });

  it("preserves unrecognized date values", () => {
    assert.equal(formatClipboardItemDate(undefined), undefined);
    assert.equal(formatClipboardItemDate("not-a-date"), "not-a-date");
  });

  it("recognizes standalone HTTP and HTTPS URLs", () => {
    assert.equal(
      getClipboardItemUrl(clipboardItem(" https://raycast.com/path?q=clipboard ")),
      "https://raycast.com/path?q=clipboard",
    );
    assert.equal(getClipboardItemUrl(clipboardItem("http://localhost:3000")), "http://localhost:3000/");
    assert.equal(getClipboardItemUrl(clipboardItem("raycast.com")), undefined);
    assert.equal(getClipboardItemUrl(clipboardItem("See https://raycast.com")), undefined);
    assert.equal(getClipboardItemUrl(clipboardItem("ftp://example.com")), undefined);
  });

  it("recognizes standalone hex color codes", () => {
    for (const color of ["#fff", "#0f08", "#12ABef", "#12345678"]) {
      assert.equal(getClipboardItemColor(clipboardItem(` ${color} `)), color);
    }

    for (const value of ["fff", "#12", "#12345", "#ggg", "Color: #fff"]) {
      assert.equal(getClipboardItemColor(clipboardItem(value)), undefined);
    }
  });

  it("recognizes existing absolute, home-relative, quoted, and file URL paths", () => {
    const cwd = process.cwd();
    assert.equal(getClipboardItemFilePath(clipboardItem(cwd)), cwd);
    assert.equal(getClipboardItemFilePath(clipboardItem(`"${cwd}"`)), cwd);
    assert.equal(getClipboardItemFilePath(clipboardItem(new URL(`file://${cwd}`).href)), cwd);
    assert.ok(getClipboardItemFilePath(clipboardItem("~")));
    assert.equal(getClipboardItemFilePath(clipboardItem("relative/path")), undefined);
    assert.equal(getClipboardItemFilePath(clipboardItem("/a/path/that/does/not/exist")), undefined);
  });

  it("recognizes common standalone shell commands and strips a conventional prompt", () => {
    assert.equal(getClipboardItemShellCommand(clipboardItem("git status")), "git status");
    assert.equal(getClipboardItemShellCommand(clipboardItem("$ pnpm test")), "pnpm test");
    assert.equal(getClipboardItemShellCommand(clipboardItem("❯ git status")), "git status");
    assert.equal(getClipboardItemShellCommand(clipboardItem("% cd ~/Developer")), "cd ~/Developer");
    assert.equal(getClipboardItemShellCommand(clipboardItem("cd /tmp")), "cd /tmp");
    assert.equal(getClipboardItemShellCommand(clipboardItem("docker compose up --build")), "docker compose up --build");
    assert.equal(getClipboardItemShellCommand(clipboardItem("git status\nnpm test")), undefined);
    assert.equal(getClipboardItemShellCommand(clipboardItem("echo hello")), undefined);
    assert.equal(getClipboardItemShellCommand(clipboardItem("Use git status")), undefined);
  });

  it("recognizes common installer commands and shell wrappers", () => {
    for (const command of [
      "bash install.sh",
      "/bin/bash -c 'curl -fsSL https://example.com/install.sh | bash'",
      "curl -fsSL https://example.com/install.sh | sh",
      "sudo apt-get install ripgrep",
      "env bash ./install.sh",
      "/usr/bin/env TOOL_VERSION=latest bash ./install.sh",
      "gem install bundler",
      "composer require vendor/package",
      "nvm install --lts",
      "xcode-select --install",
    ]) {
      assert.equal(getClipboardItemShellCommand(clipboardItem(command)), command);
    }

    assert.equal(getClipboardItemShellCommand(clipboardItem("sudo echo hello")), undefined);
    assert.equal(getClipboardItemShellCommand(clipboardItem("env MESSAGE=hello echo $MESSAGE")), undefined);
  });

  it("recognizes user-whitelisted executables without accepting command fragments", () => {
    const whitelist = parseClipboardCommandWhitelist("my-cli, deploy_tool\n7zip, MY-CLI, bad entry, nope;rm");
    assert.deepEqual([...whitelist], ["my-cli", "deploy_tool", "7zip"]);
    assert.equal(getClipboardItemShellCommand(clipboardItem("my-cli deploy"), whitelist), "my-cli deploy");
    assert.equal(
      getClipboardItemShellCommand(clipboardItem("sudo deploy_tool production"), whitelist),
      "sudo deploy_tool production",
    );
    assert.equal(
      getClipboardItemShellCommand(clipboardItem("7zip archive project"), whitelist),
      "7zip archive project",
    );
    assert.equal(getClipboardItemShellCommand(clipboardItem("unknown-command install"), whitelist), undefined);
  });
});
