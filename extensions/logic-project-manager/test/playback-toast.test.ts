import { describe, expect, it } from "vitest";
import { playbackToastContent } from "@/core/ui/projects/playback-toast";

const base = {
  projectName: "Demo Song",
  playingId: "demo-song",
  playbackStatus: "Playing" as const,
  positionSeconds: 65,
  durationSeconds: 200,
};

describe("playbackToastContent", () => {
  it("播放中显示曲名和进度", () => {
    expect(playbackToastContent(base)).toEqual({ active: true, title: "Demo Song", message: "1:05 / 3:20" });
  });

  it("Starting 也算播放中", () => {
    expect(playbackToastContent({ ...base, playbackStatus: "Starting" }).active).toBe(true);
  });

  it("暂停和停止时不显示", () => {
    expect(playbackToastContent({ ...base, playbackStatus: "Paused" }).active).toBe(false);
    expect(playbackToastContent({ ...base, playbackStatus: "Stopped" }).active).toBe(false);
  });

  it("没有 playingId 时不显示", () => {
    expect(playbackToastContent({ ...base, playingId: null }).active).toBe(false);
  });

  it("还不知道曲名时退回 Playing Latest Bounce", () => {
    expect(playbackToastContent({ ...base, projectName: "" }).title).toBe("Playing Latest Bounce");
  });

  it("时长未知时 message 为空", () => {
    expect(playbackToastContent({ ...base, durationSeconds: 0 }).message).toBe("");
  });
});
