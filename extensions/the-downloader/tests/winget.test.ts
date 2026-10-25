import { describe, it, expect } from "vitest";
import { isWingetNotInstalled, wingetRow } from "../src/lib/winget";

// Output captured from winget 1.29 on Windows 11, as a child process sees it (CRLF line ends).
const listFfmpeg = [
  "Name              Id            Version                       Source",
  "---------------------------------------------------------------------",
  "FFmpeg for yt-dlp yt-dlp.FFmpeg N-127043-g5a54fcf75e-20260930 winget",
].join("\r\n");

const listYtdlp = [
  "Name   Id            Version    Source",
  "---------------------------------------",
  "yt-dlp yt-dlp.yt-dlp 2026.10.21 winget",
].join("\r\n");

const listWithUpgrade = [
  "Name   Id            Version    Available  Source",
  "--------------------------------------------------",
  "yt-dlp yt-dlp.yt-dlp 2026.09.20 2026.10.21 winget",
].join("\r\n");

const upgrade = [
  "Name                             Id                                      Version        Available      Source",
  "--------------------------------------------------------------------------------------------------------------",
  "ChatGPT                          OpenAI.ChatGPT                          26.1013.4894.0 26.1021.3705.0 winget",
  "FFmpeg for yt-dlp                yt-dlp.FFmpeg                           N-127043-g5a54fcf75e-20260930 N-127500-gabcdef1234-20261020 winget",
  "gallery-dl                       mikf.gallery-dl                         < 1.32.0       1.32.17        winget",
  "TeamSpeak                        TeamSpeakSystems.TeamSpeakClient.Beta.6 5.0.0          6.0.0-beta4.1  winget",
  "4 upgrades available.",
].join("\r\n");

describe("wingetRow", () => {
  it("reads a version that isn't dotted numbers (yt-dlp's FFmpeg build)", () => {
    expect(wingetRow(listFfmpeg, "yt-dlp.FFmpeg")).toEqual({ version: "N-127043-g5a54fcf75e-20260930" });
  });

  it("reads a dotted version and no Available column", () => {
    expect(wingetRow(listYtdlp, "yt-dlp.yt-dlp")).toEqual({ version: "2026.10.21" });
  });

  it("reads Available when `winget list` shows an upgrade", () => {
    expect(wingetRow(listWithUpgrade, "yt-dlp.yt-dlp")).toEqual({ version: "2026.09.20", available: "2026.10.21" });
  });

  it("reads Version and Available from `winget upgrade`", () => {
    expect(wingetRow(upgrade, "yt-dlp.FFmpeg")).toEqual({
      version: "N-127043-g5a54fcf75e-20260930",
      available: "N-127500-gabcdef1234-20261020",
    });
    expect(wingetRow(upgrade, "OpenAI.ChatGPT")?.available).toBe("26.1021.3705.0");
  });

  it("keeps a `<` version together with its number", () => {
    expect(wingetRow(upgrade, "mikf.gallery-dl")).toEqual({ version: "< 1.32.0", available: "1.32.17" });
  });

  it("matches the whole Id only, ignoring case", () => {
    expect(wingetRow(upgrade, "TeamSpeakSystems.TeamSpeakClient")).toBeUndefined();
    expect(wingetRow(listYtdlp, "YT-DLP.YT-DLP")?.version).toBe("2026.10.21");
  });

  it("returns undefined when the package isn't listed", () => {
    expect(wingetRow(upgrade, "Y2Z.Monolith")).toBeUndefined();
    expect(wingetRow("No installed package found matching input criteria.", "Y2Z.Monolith")).toBeUndefined();
  });
});

describe("isWingetNotInstalled", () => {
  it("accepts NO_APPLICATIONS_FOUND in both its unsigned and signed form", () => {
    expect(isWingetNotInstalled(2316632084)).toBe(true);
    expect(isWingetNotInstalled(-1978335212)).toBe(true);
  });

  it("rejects success and other failures", () => {
    expect(isWingetNotInstalled(0)).toBe(false);
    expect(isWingetNotInstalled(1)).toBe(false);
    expect(isWingetNotInstalled(undefined)).toBe(false);
  });
});
