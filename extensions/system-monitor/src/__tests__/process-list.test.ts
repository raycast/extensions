import { describe, expect, it, vi } from "vitest";

import { getProcessList, getTopProcesses } from "../lib/process-list";
import { execf } from "../lib/exec";

vi.mock("../lib/exec", () => ({
  execf: vi.fn(),
}));

const PS_OUTPUT = [
  "  501 42.0  1.2  204800   1 root     01-02:03:04 /usr/libexec/heavy-worker --flag value",
  "  502  5.5 12.5 2097152 501 eitel    12:34 /Applications/Slack.app/Contents/MacOS/Slack",
  "  503  0.1  0.0     512 501 eitel    00:05 tiny",
  "not a ps line",
].join("\n");

describe("getProcessList", () => {
  it("parses ps output into process details", async () => {
    vi.mocked(execf).mockResolvedValue(PS_OUTPUT);

    const processes = await getProcessList("cpu");

    expect(processes).toHaveLength(3);
    expect(processes[0]).toMatchObject({
      pid: 501,
      name: "heavy-worker",
      metric: "42.0 %",
      ppid: 1,
      user: "root",
      elapsed: "01-02:03:04",
      command: "/usr/libexec/heavy-worker --flag value",
    });
  });

  it("formats memory metrics from rss and sorts flags by mode", async () => {
    vi.mocked(execf).mockResolvedValue(PS_OUTPUT);

    const processes = await getProcessList("memory");

    expect(processes[0].metric).toBe("200 MB");
    expect(processes[1].metric).toBe("2.0 GB");
    expect(processes[2].metric).toBe("512 KB");
    expect(vi.mocked(execf)).toHaveBeenLastCalledWith("/bin/ps", [
      "-axo",
      "pid=,pcpu=,pmem=,rss=,ppid=,user=,etime=,command=",
      "-m",
    ]);
  });

  it("drops unparseable lines instead of throwing", async () => {
    vi.mocked(execf).mockResolvedValue("garbage\nmore garbage");

    expect(await getProcessList("cpu")).toEqual([]);
  });

  it("limits the preview list", async () => {
    vi.mocked(execf).mockResolvedValue(PS_OUTPUT);

    const preview = await getTopProcesses("cpu", 2);
    expect(preview).toHaveLength(2);
  });
});
