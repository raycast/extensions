import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTree, buildAuthHeader, flattenJobs } from "./jenkins";
import type { RawJenkinsNode } from "../types";

// Mock node-fetch for API function tests
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

describe("buildTree", () => {
  it("buildTree(0) returns base fields including lastBuild", () => {
    expect(buildTree(0)).toBe(
      "name,url,color,_class,lastBuild[number,timestamp,result]",
    );
  });

  it("buildTree(1) wraps with jobs[...]", () => {
    expect(buildTree(1)).toBe(
      "name,url,color,_class,jobs[name,url,color,_class,lastBuild[number,timestamp,result]]",
    );
  });

  it("buildTree(6) contains 6 levels of nested jobs[", () => {
    const result = buildTree(6);
    const matches = result.match(/jobs\[/g) ?? [];
    expect(matches.length).toBe(6);
  });

  it("buildTree(6) includes lastBuild at leaf level", () => {
    const result = buildTree(6);
    expect(result).toContain("lastBuild[number,timestamp,result]");
  });
});

describe("buildAuthHeader", () => {
  it("returns Basic base64(user:token)", () => {
    const header = buildAuthHeader("user", "token");
    expect(header).toBe(
      "Basic " + Buffer.from("user:token").toString("base64"),
    );
  });
});

describe("flattenJobs", () => {
  it("returns empty array for empty input", () => {
    expect(flattenJobs([])).toEqual([]);
  });

  it("returns one JenkinsJob for a simple leaf node", () => {
    const nodes: RawJenkinsNode[] = [
      { name: "my-job", url: "http://jenkins/job/my-job/", color: "blue" },
    ];
    const result = flattenJobs(nodes);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "my-job",
      url: "https://jenkins/job/my-job/",
      path: "my-job",
      status: "success",
    });
  });

  it("flattens nested folders and preserves path", () => {
    const nodes: RawJenkinsNode[] = [
      {
        name: "folder",
        url: "http://jenkins/job/folder/",
        jobs: [
          {
            name: "subfolder",
            url: "http://jenkins/job/folder/job/subfolder/",
            jobs: [
              {
                name: "leaf-job",
                url: "http://jenkins/job/folder/job/subfolder/job/leaf-job/",
                color: "red",
              },
            ],
          },
        ],
      },
    ];
    const result = flattenJobs(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("folder/subfolder/leaf-job");
    expect(result[0].status).toBe("failure");
  });

  it("filters out MultiBranch parents and includes their branch children", () => {
    const nodes: RawJenkinsNode[] = [
      {
        name: "my-multibranch",
        url: "http://jenkins/job/my-multibranch/",
        _class:
          "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject",
        jobs: [
          {
            name: "main",
            url: "http://jenkins/job/my-multibranch/job/main/",
            color: "blue",
          },
          {
            name: "feature-x",
            url: "http://jenkins/job/my-multibranch/job/feature-x/",
            color: "red",
          },
        ],
      },
    ];
    const result = flattenJobs(nodes);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("my-multibranch/main");
    expect(result[1].path).toBe("my-multibranch/feature-x");
  });

  it("returns empty array for MultiBranch parent with no children", () => {
    const nodes: RawJenkinsNode[] = [
      {
        name: "empty-multibranch",
        url: "http://jenkins/job/empty-multibranch/",
        _class:
          "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject",
        jobs: [],
      },
    ];
    expect(flattenJobs(nodes)).toEqual([]);
  });

  it("extracts lastBuild from RawJenkinsNode and populates JenkinsJob.lastBuild", () => {
    const nodes: RawJenkinsNode[] = [
      {
        name: "my-job",
        url: "http://jenkins/job/my-job/",
        color: "blue",
        lastBuild: { number: 42, timestamp: 1700000000000, result: "SUCCESS" },
      },
    ];
    const result = flattenJobs(nodes);
    expect(result[0].lastBuild).toEqual({
      number: 42,
      timestamp: 1700000000000,
      result: "SUCCESS",
    });
  });

  it("sets lastBuild to undefined when node has no lastBuild", () => {
    const nodes: RawJenkinsNode[] = [
      { name: "my-job", url: "http://jenkins/job/my-job/", color: "blue" },
    ];
    const result = flattenJobs(nodes);
    expect(result[0].lastBuild).toBeUndefined();
  });
});

describe("fetchJobParameters", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("parses Jenkins parameterDefinitions response into BuildParameter[]", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        property: [
          {
            parameterDefinitions: [
              {
                name: "BRANCH",
                type: "StringParameterDefinition",
                description: "Branch to build",
                defaultParameterValue: { value: "main" },
              },
            ],
          },
        ],
      }),
    } as never);

    const { fetchJobParameters } = await import("./jenkins");
    const result = await fetchJobParameters("http://jenkins/job/my-job/");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "BRANCH",
      type: "StringParameterDefinition",
      description: "Branch to build",
      defaultValue: "main",
    });
  });

  it("returns empty array when job has no parameters (empty property array)", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ property: [] }),
    } as never);

    const { fetchJobParameters } = await import("./jenkins");
    const result = await fetchJobParameters("http://jenkins/job/my-job/");
    expect(result).toEqual([]);
  });

  it("maps StringParameterDefinition correctly", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        property: [
          {
            parameterDefinitions: [
              {
                name: "NAME",
                type: "StringParameterDefinition",
                description: "A string param",
                defaultParameterValue: { value: "default" },
              },
            ],
          },
        ],
      }),
    } as never);

    const { fetchJobParameters } = await import("./jenkins");
    const result = await fetchJobParameters("http://jenkins/job/my-job/");
    expect(result[0].type).toBe("StringParameterDefinition");
    expect(result[0].defaultValue).toBe("default");
  });

  it("maps ChoiceParameterDefinition with choices array", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        property: [
          {
            parameterDefinitions: [
              {
                name: "ENV",
                type: "ChoiceParameterDefinition",
                choices: ["dev", "staging", "prod"],
              },
            ],
          },
        ],
      }),
    } as never);

    const { fetchJobParameters } = await import("./jenkins");
    const result = await fetchJobParameters("http://jenkins/job/my-job/");
    expect(result[0].type).toBe("ChoiceParameterDefinition");
    expect(result[0].choices).toEqual(["dev", "staging", "prod"]);
  });

  it("maps BooleanParameterDefinition with boolean defaultValue", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        property: [
          {
            parameterDefinitions: [
              {
                name: "DRY_RUN",
                type: "BooleanParameterDefinition",
                defaultParameterValue: { value: true },
              },
            ],
          },
        ],
      }),
    } as never);

    const { fetchJobParameters } = await import("./jenkins");
    const result = await fetchJobParameters("http://jenkins/job/my-job/");
    expect(result[0].type).toBe("BooleanParameterDefinition");
    expect(result[0].defaultValue).toBe(true);
  });
});

describe("triggerBuild", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns Location header value as queue item URL on 201", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: false } as never); // crumb fetch: disabled
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 201,
      headers: {
        get: (name: string) =>
          name === "location" ? "http://jenkins/queue/item/42/" : null,
      },
    } as never);

    const { triggerBuild } = await import("./jenkins");
    const result = await triggerBuild("http://jenkins/job/my-job/", {
      BRANCH: "main",
    });
    expect(result).toBe("http://jenkins/queue/item/42/");
  });

  it("uses /build endpoint when params is empty object", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: false } as never); // crumb fetch: disabled
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 201,
      headers: { get: () => "http://jenkins/queue/item/1/" },
    } as never);

    const { triggerBuild } = await import("./jenkins");
    await triggerBuild("http://jenkins/job/my-job/", {});
    const calledUrl = mockFetch.mock.calls[1][0] as string;
    expect(calledUrl).toContain("/build");
    expect(calledUrl).not.toContain("buildWithParameters");
  });

  it("uses /buildWithParameters with query string when params has keys", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: false } as never); // crumb fetch: disabled
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 201,
      headers: { get: () => "http://jenkins/queue/item/2/" },
    } as never);

    const { triggerBuild } = await import("./jenkins");
    await triggerBuild("http://jenkins/job/my-job/", { KEY: "VALUE" });
    const calledUrl = mockFetch.mock.calls[1][0] as string;
    expect(calledUrl).toContain("buildWithParameters");
    expect(calledUrl).toContain("KEY=VALUE");
  });
});

describe("pollQueueItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns build number when executable.number exists in response", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        executable: { number: 7, url: "http://jenkins/job/my-job/7/" },
      }),
    } as never);

    const { pollQueueItem } = await import("./jenkins");
    const result = await pollQueueItem("http://jenkins/queue/item/42/");
    expect(result).toBe(7);
  });

  it("returns null when executable field is absent", async () => {
    const { default: fetch } = await import("node-fetch");
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ why: "waiting in queue" }),
    } as never);

    const { pollQueueItem } = await import("./jenkins");
    const result = await pollQueueItem("http://jenkins/queue/item/42/");
    expect(result).toBeNull();
  });
});
