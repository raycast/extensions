import { afterEach, describe, expect, it, vi } from "vitest";
import { HarvestClient } from "../api/harvest";
import {
  fetchActiveJobPosts,
  fetchJobPipelineData,
  fetchOpenJobs,
} from "./harvestData";
import type {
  HarvestApplication,
  HarvestCandidate,
  HarvestJob,
  HarvestJobPost,
  HarvestJobStage,
} from "./types";

const toJsonResponse = (
  data: unknown,
  headers: Record<string, string> = {},
) => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
};

const resolveUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchOpenJobs", () => {
  it("fetches open jobs across pages", async () => {
    const client = new HarvestClient({ apiKey: "test-key" });
    const firstPage: HarvestJob[] = [
      { id: 101, name: "Designer", status: "open", confidential: false },
    ];
    const secondPage: HarvestJob[] = [
      { id: 202, name: "Engineer", status: "open", confidential: true },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url.includes("/jobs?status=open")) {
        return toJsonResponse(firstPage, {
          Link: '<https://harvest.greenhouse.io/v1/jobs?page=2>; rel="next"',
        });
      }
      if (url.includes("/jobs?page=2")) {
        return toJsonResponse(secondPage);
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const results = await fetchOpenJobs(client);

    expect(results).toEqual([...firstPage, ...secondPage]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCallUrl = resolveUrl(fetchMock.mock.calls[0]?.[0]);
    const firstParams = new URL(firstCallUrl).searchParams;
    expect(firstParams.get("status")).toBe("open");
  });
});

describe("fetchJobPipelineData", () => {
  it("fetches stages, applications, and candidates for a job", async () => {
    const client = new HarvestClient({ apiKey: "test-key" });
    const jobId = 555;
    const stages: HarvestJobStage[] = [
      {
        id: 1,
        name: "Applied",
        job_id: jobId,
        priority: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];
    const applications: HarvestApplication[] = [
      {
        id: 11,
        candidate_id: 201,
        applied_at: "2024-01-05T00:00:00Z",
        last_activity_at: null,
        current_stage: { id: 1, name: "Applied" },
        status: "active",
        jobs: [{ id: jobId, name: "Engineer" }],
      },
      {
        id: 12,
        candidate_id: 201,
        applied_at: "2024-01-06T00:00:00Z",
        last_activity_at: null,
        current_stage: { id: 1, name: "Applied" },
        status: "active",
        jobs: [{ id: jobId, name: "Engineer" }],
      },
      {
        id: 13,
        candidate_id: 202,
        applied_at: "2024-01-07T00:00:00Z",
        last_activity_at: null,
        current_stage: { id: 1, name: "Applied" },
        status: "active",
        jobs: [{ id: jobId, name: "Engineer" }],
      },
    ];
    const candidates: HarvestCandidate[] = [
      { id: 201, first_name: "Ada", last_name: "Lovelace" },
      { id: 202, name: "Grace Hopper" },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      const parsed = new URL(url);

      if (parsed.pathname === `/v1/jobs/${jobId}/stages`) {
        return toJsonResponse(stages);
      }

      if (parsed.pathname === "/v1/applications") {
        expect(parsed.searchParams.get("job_id")).toBe(String(jobId));
        expect(parsed.searchParams.get("status")).toBe("active");
        return toJsonResponse(applications);
      }

      if (parsed.pathname === "/v1/candidates") {
        expect(parsed.searchParams.get("candidate_ids")).toBe("201,202");
        return toJsonResponse(candidates);
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchJobPipelineData(client, jobId);

    expect(result.stages).toEqual(stages);
    expect(result.applications).toEqual(applications);
    expect(result.candidates).toEqual({
      201: candidates[0],
      202: candidates[1],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("fetchActiveJobPosts", () => {
  it("returns jobs sorted alphabetically by title", async () => {
    const client = new HarvestClient({ apiKey: "test-key" });
    const jobs: HarvestJob[] = [
      { id: 100, name: "Zebra Keeper", status: "open", confidential: false },
      { id: 200, name: "Apple Picker", status: "open", confidential: false },
      { id: 300, name: "Manager", status: "open", confidential: false },
    ];
    const posts: HarvestJobPost[] = [
      {
        id: 1,
        title: "Zebra Keeper",
        job_id: 100,
        active: true,
        live: true,
        internal: false,
        external: true,
      },
      {
        id: 2,
        title: "Apple Picker",
        job_id: 200,
        active: true,
        live: true,
        internal: true,
        external: false,
      },
      {
        id: 3,
        title: "Manager",
        job_id: 300,
        active: true,
        live: true,
        internal: false,
        external: true,
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url.includes("/jobs")) return toJsonResponse(jobs);
      if (url.includes("/job_posts")) return toJsonResponse(posts);
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const results = await fetchActiveJobPosts(client);

    expect(results.map((j) => j.title)).toEqual([
      "Apple Picker",
      "Manager",
      "Zebra Keeper",
    ]);
  });

  it("merges internal and external posts for the same job", async () => {
    const client = new HarvestClient({ apiKey: "test-key" });
    const jobs: HarvestJob[] = [
      { id: 100, name: "Engineer", status: "open", confidential: false },
    ];
    const posts: HarvestJobPost[] = [
      {
        id: 1,
        title: "Engineer",
        job_id: 100,
        active: true,
        live: true,
        internal: false,
        external: true,
      },
      {
        id: 2,
        title: "Engineer",
        job_id: 100,
        active: true,
        live: false,
        internal: true,
        external: false,
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url.includes("/jobs")) return toJsonResponse(jobs);
      if (url.includes("/job_posts")) return toJsonResponse(posts);
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const results = await fetchActiveJobPosts(client);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      job_id: 100,
      title: "Engineer",
      hasInternal: true,
      hasExternal: true,
      hasNoPosts: false,
    });
  });

  it("includes jobs without posts and marks them as hasNoPosts", async () => {
    const client = new HarvestClient({ apiKey: "test-key" });
    const jobs: HarvestJob[] = [
      { id: 100, name: "Posted Job", status: "open", confidential: false },
      { id: 200, name: "Unposted Job", status: "open", confidential: false },
    ];
    const posts: HarvestJobPost[] = [
      {
        id: 1,
        title: "Posted Job",
        job_id: 100,
        active: true,
        live: true,
        internal: false,
        external: true,
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url.includes("/jobs")) return toJsonResponse(jobs);
      if (url.includes("/job_posts")) return toJsonResponse(posts);
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const results = await fetchActiveJobPosts(client);

    expect(results).toHaveLength(2);
    const postedJob = results.find((j) => j.title === "Posted Job");
    const unpostedJob = results.find((j) => j.title === "Unposted Job");

    expect(postedJob).toEqual({
      job_id: 100,
      title: "Posted Job",
      hasInternal: false,
      hasExternal: true,
      hasNoPosts: false,
    });
    expect(unpostedJob).toEqual({
      job_id: 200,
      title: "Unposted Job",
      hasInternal: false,
      hasExternal: false,
      hasNoPosts: true,
    });
  });

  it("skips jobs without a name", async () => {
    const client = new HarvestClient({ apiKey: "test-key" });
    const jobs = [
      { id: 100, name: "Valid Job", status: "open", confidential: false },
      { id: 200, name: "", status: "open", confidential: false },
      { id: 300, name: null, status: "open", confidential: false },
    ];
    const posts: HarvestJobPost[] = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = resolveUrl(input);
      if (url.includes("/jobs")) return toJsonResponse(jobs);
      if (url.includes("/job_posts")) return toJsonResponse(posts);
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const results = await fetchActiveJobPosts(client);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Valid Job");
  });
});
