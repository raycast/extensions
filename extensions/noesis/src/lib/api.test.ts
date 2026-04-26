import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTarot,
  calculateEngine,
  executeWorkflow,
  fetchRemoteSnapshot,
  normalizeBaseUrl,
  updateUserProfile,
  validateSelemeneCredentials,
  withTarotExecutionOptions,
} from "./api";

test("normalizeBaseUrl strips trailing slash and api/v1 suffix", () => {
  assert.equal(
    normalizeBaseUrl("https://selemene.tryambakam.space/api/v1/"),
    "https://selemene.tryambakam.space",
  );
  assert.equal(
    normalizeBaseUrl("https://selemene.tryambakam.space/"),
    "https://selemene.tryambakam.space",
  );
});

test("validateSelemeneCredentials uses X-API-Key auth", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fetchStub = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });

    return new Response(
      JSON.stringify({
        id: "user-1",
        email: "user@example.com",
        full_name: "Witness User",
        tier: "pro",
        consciousness_level: 3,
        experience_points: 120,
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const profile = await validateSelemeneCredentials(
    {
      baseUrl: "https://selemene.tryambakam.space/api/v1/",
      apiKey: "nk_test_key",
    },
    fetchStub,
  );

  assert.equal(
    calls[0]?.url,
    "https://selemene.tryambakam.space/api/v1/users/me",
  );
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get("X-API-Key"), "nk_test_key");
  assert.equal(profile.fullName, "Witness User");
});

test("fetchRemoteSnapshot maps service, catalog, usage, and readings payloads", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fetchStub = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });

    if (url.endsWith("/health/live")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          version: "3.0.0",
          uptime_seconds: 42,
          engines_loaded: 16,
          workflows_loaded: 6,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/status")) {
      return new Response(
        JSON.stringify({
          engines: ["numerology", "panchanga"],
          workflows: [
            {
              id: "daily-practice",
              name: "Daily Practice",
              description: "Reflection workflow",
              engine_count: 2,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": "200",
            "X-RateLimit-Remaining": "199",
            "X-RateLimit-Reset": "1713268800",
          },
        },
      );
    }

    if (url.endsWith("/api/v1/workflows/daily-practice/info")) {
      return new Response(
        JSON.stringify({
          id: "daily-practice",
          name: "Daily Practice",
          description: "Reflection workflow",
          engine_ids: ["panchanga", "vedic-clock"],
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/engines/numerology/info")) {
      return new Response(
        JSON.stringify({
          engine_id: "numerology",
          engine_name: "Numerology",
          required_phase: 0,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/engines/panchanga/info")) {
      return new Response(
        JSON.stringify({
          engine_id: "panchanga",
          engine_name: "Panchanga",
          required_phase: 0,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/users/me")) {
      return new Response(
        JSON.stringify({
          id: "user-1",
          email: "user@example.com",
          full_name: "Witness User",
          tier: "pro",
          consciousness_level: 3,
          experience_points: 120,
          birth_date: "1991-08-24",
          birth_time: "03:45:00",
          birth_location: {
            lat: 12.9716,
            lng: 77.5946,
            name: "Bengaluru, India",
          },
          timezone: "Asia/Kolkata",
          preferences: {
            precision: "high",
          },
        }),
        { status: 200 },
      );
    }

    if (url.includes("/api/v1/users/me/usage")) {
      return new Response(
        JSON.stringify({
          user_id: "user-1",
          daily: { total: 3, success: 3, failure: 0 },
          monthly: { total: 12, success: 10, failure: 2 },
          engine_breakdown: [{ engine_id: "numerology", request_count: 4 }],
        }),
        { status: 200 },
      );
    }

    if (url.includes("/api/v1/readings?") || url.endsWith("/api/v1/readings")) {
      return new Response(
        JSON.stringify({
          readings: [
            {
              id: "reading-1",
              engine_id: "numerology",
              workflow_id: null,
              input_hash: "hash-1",
              witness_prompt: "Notice the pattern.",
              consciousness_level: 2,
              calculation_time_ms: 18.5,
              created_at: "2026-04-16T18:00:00Z",
              result_data: { life_path: 9 },
            },
          ],
          total: 1,
          limit: 25,
          offset: 0,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/readings/stats")) {
      return new Response(
        JSON.stringify({
          total: 1,
          stats: [{ engine_id: "numerology", count: 1 }],
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  const snapshot = await fetchRemoteSnapshot(
    {
      baseUrl: "https://selemene.tryambakam.space/api/v1/",
      apiKey: "nk_test_key",
    },
    {
      fetchImpl: fetchStub,
      includeService: true,
      includeCatalog: true,
      includeProfile: true,
      includeUsage: true,
      includeReadings: true,
    },
  );

  assert.equal(snapshot.baseUrl, "https://selemene.tryambakam.space");
  assert.equal(snapshot.health?.enginesLoaded, 16);
  assert.equal(snapshot.workflows?.[0]?.engineIds[0], "panchanga");
  assert.equal(snapshot.engines?.[0]?.name, "Numerology");
  assert.equal(snapshot.profile?.email, "user@example.com");
  assert.equal(snapshot.profile?.birthLocation?.name, "Bengaluru, India");
  assert.equal(snapshot.profile?.timezone, "Asia/Kolkata");
  assert.equal(snapshot.profile?.preferences.precision, "high");
  assert.equal(snapshot.usage?.engineBreakdown[0]?.requestCount, 4);
  assert.equal(snapshot.readings?.[0]?.witnessPrompt, "Notice the pattern.");
  assert.equal(snapshot.readingStats?.[0]?.count, 1);
  assert.equal(snapshot.rateLimit?.remaining, 199);
  assert.deepEqual(snapshot.syncIssues, []);
  assert.deepEqual(snapshot.readings?.[0]?.payload, {
    engine_id: "numerology",
    witness_prompt: "Notice the pattern.",
    consciousness_level: 2,
    timestamp: "2026-04-16T18:00:00Z",
    metadata: {
      calculation_time_ms: 18.5,
    },
    result: {
      life_path: 9,
    },
  });

  const authenticatedCalls = calls.filter(
    (call) => !call.url.endsWith("/health/live"),
  );
  for (const call of authenticatedCalls) {
    const headers = new Headers(call.init?.headers);
    assert.equal(headers.get("X-API-Key"), "nk_test_key");
  }
});

test("fetchRemoteSnapshot surfaces auth failures clearly", async () => {
  const fetchStub = (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.endsWith("/health/live")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          version: "3.0.0",
          uptime_seconds: 42,
          engines_loaded: 16,
          workflows_loaded: 6,
        }),
        { status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid or expired API key" }),
      { status: 401 },
    );
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchRemoteSnapshot(
        {
          baseUrl: "https://selemene.tryambakam.space",
          apiKey: "nk_bad_key",
        },
        {
          fetchImpl: fetchStub,
          includeService: true,
          includeCatalog: false,
          includeProfile: false,
          includeUsage: false,
          includeReadings: false,
        },
      ),
    /Authentication failed/i,
  );
});

test("calculateEngine posts execution input and maps the engine result", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fetchStub = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });

    return new Response(
      JSON.stringify({
        engine_id: "tarot",
        result: { card: "The Hermit" },
        witness_prompt: "Withdraw and listen carefully.",
        consciousness_level: 5,
        metadata: { spread: "single-card", calculation_time_ms: 27.1 },
        timestamp: "2026-04-22T13:14:15Z",
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await calculateEngine(
    {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test_key",
    },
    "tarot",
    {
      birthData: {
        name: "Witness User",
        date: "1991-08-24",
        time: "03:45:00",
        latitude: 12.9716,
        longitude: 77.5946,
        timezone: "Asia/Kolkata",
      },
      currentTime: "2026-04-22T13:00:00Z",
      precision: "High",
      options: {
        question: "What needs attention?",
      },
    },
    fetchStub,
  );

  assert.equal(
    calls[0]?.url,
    "https://selemene.tryambakam.space/api/v1/engines/tarot/calculate",
  );
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get("X-API-Key"), "nk_test_key");
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    birth_data: {
      name: "Witness User",
      date: "1991-08-24",
      time: "03:45:00",
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: "Asia/Kolkata",
    },
    current_time: "2026-04-22T13:00:00Z",
    precision: "High",
    options: {
      question: "What needs attention?",
    },
  });
  assert.equal(result.engineId, "tarot");
  assert.equal(result.witnessPrompt, "Withdraw and listen carefully.");
  assert.equal(result.result.card, "The Hermit");
  assert.equal(result.metadata.spread, "single-card");
  assert.equal(result.timestamp, "2026-04-22T13:14:15Z");
  assert.equal(result.route?.target, "selemene");
  assert.equal(result.route?.label, "Selemene Direct");
});

test("withTarotExecutionOptions merges and normalizes tarot options", () => {
  const input = withTarotExecutionOptions(
    {
      precision: "Standard",
      options: {
        mode: "reflective",
      },
    },
    {
      question: "What needs awareness?",
      spread: "yes_no",
    },
  );

  assert.deepEqual(input.options, {
    mode: "reflective",
    question: "What needs awareness?",
    spread: "yes_no",
  });
});

test("calculateTarot posts canonical spread and question", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fetchStub = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });

    return new Response(
      JSON.stringify({
        engine_id: "tarot",
        result: { spread: "yes_no" },
        metadata: { spread: "yes_no", calculation_time_ms: 12.2 },
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await calculateTarot(
    {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test_key",
    },
    {
      precision: "High",
      options: {
        context: "decision",
      },
    },
    {
      question: "Should I move now?",
      spread: "yes_no",
    },
    fetchStub,
  );

  assert.equal(
    calls[0]?.url,
    "https://selemene.tryambakam.space/api/v1/engines/tarot/calculate",
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    precision: "High",
    options: {
      context: "decision",
      question: "Should I move now?",
      spread: "yes_no",
    },
  });
  assert.equal(result.engineId, "tarot");
  assert.equal(result.metadata.spread, "yes_no");
});

test("executeWorkflow posts execution input and maps workflow outputs", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fetchStub = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });

    return new Response(
      JSON.stringify({
        workflow_id: "daily-practice",
        engine_outputs: {
          panchanga: {
            result: { tithi: "Ekadashi" },
            witness_prompt: "Observe the fasting current.",
            metadata: { calculation_time_ms: 12.5 },
          },
          numerology: {
            result: { life_path: 9 },
            witness_prompt: "Completion energy is dominant.",
            consciousness_level: 4,
            metadata: { calculation_time_ms: 8.1 },
          },
        },
        synthesis: {
          summary: "A reflective and disciplined day.",
        },
        witness_layer: {
          witness_question: "What quiet discipline wants expression today?",
        },
        total_time_ms: 25.4,
        timestamp: "2026-04-22T13:15:00Z",
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await executeWorkflow(
    {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test_key",
    },
    "daily-practice",
    {
      birthData: {
        date: "1991-08-24",
        time: "03:45:00",
        timezone: "Asia/Kolkata",
      },
      precision: "Standard",
      options: {
        mode: "daily",
      },
    },
    fetchStub,
  );

  assert.equal(
    calls[0]?.url,
    "https://selemene.tryambakam.space/api/v1/workflows/daily-practice/execute",
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    birth_data: {
      date: "1991-08-24",
      time: "03:45:00",
      timezone: "Asia/Kolkata",
    },
    precision: "Standard",
    options: {
      mode: "daily",
    },
  });
  assert.equal(result.workflowId, "daily-practice");
  assert.equal(result.engineOutputs.panchanga?.engineId, "panchanga");
  assert.equal(result.engineOutputs.numerology?.consciousnessLevel, 4);
  assert.equal(result.synthesis.summary, "A reflective and disciplined day.");
  assert.deepEqual(result.synthesis.witness_layer, {
    witness_question: "What quiet discipline wants expression today?",
  });
  assert.equal(result.totalTimeMs, 25.4);
  assert.equal(result.route?.target, "selemene");
});

test("fetchRemoteSnapshot keeps partial failures as sync issues", async () => {
  const fetchStub = (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.endsWith("/health/live")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          version: "3.0.0",
          uptime_seconds: 42,
          engines_loaded: 16,
          workflows_loaded: 6,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/status")) {
      return new Response(
        JSON.stringify({
          engines: [],
          workflows: [],
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/users/me")) {
      return new Response(JSON.stringify({ error: "Profile unavailable" }), {
        status: 503,
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  const snapshot = await fetchRemoteSnapshot(
    {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test_key",
    },
    {
      fetchImpl: fetchStub,
      includeService: true,
      includeCatalog: true,
      includeProfile: true,
      includeUsage: false,
      includeReadings: false,
    },
  );

  const syncIssues = snapshot.syncIssues ?? [];
  assert.equal(snapshot.profile, undefined);
  assert.equal(syncIssues.length, 1);
  assert.equal(syncIssues[0]?.resource, "profile");
  assert.match(syncIssues[0]?.message ?? "", /Profile unavailable/);
});

test("fetchRemoteSnapshot preserves full reading payloads when explicitly enabled", async () => {
  const fetchStub = (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes("/api/v1/readings?") || url.endsWith("/api/v1/readings")) {
      return new Response(
        JSON.stringify({
          readings: [
            {
              id: "reading-1",
              engine_id: "numerology",
              workflow_id: null,
              input_hash: "hash-1",
              witness_prompt: "Notice the pattern.",
              consciousness_level: 2,
              calculation_time_ms: 18.5,
              created_at: "2026-04-16T18:00:00Z",
              result_data: { life_path: 9 },
              trace_id: "trace-1",
            },
          ],
          total: 1,
          limit: 25,
          offset: 0,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/v1/readings/stats")) {
      return new Response(
        JSON.stringify({
          total: 1,
          stats: [{ engine_id: "numerology", count: 1 }],
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  const snapshot = await fetchRemoteSnapshot(
    {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test_key",
    },
    {
      fetchImpl: fetchStub,
      includeService: false,
      includeCatalog: false,
      includeProfile: false,
      includeUsage: false,
      includeReadings: true,
      includeRawPayloads: true,
    },
  );

  assert.deepEqual(snapshot.readings?.[0]?.payload, {
    id: "reading-1",
    engine_id: "numerology",
    workflow_id: null,
    input_hash: "hash-1",
    witness_prompt: "Notice the pattern.",
    consciousness_level: 2,
    calculation_time_ms: 18.5,
    created_at: "2026-04-16T18:00:00Z",
    result_data: { life_path: 9 },
    trace_id: "trace-1",
  });
});

test("updateUserProfile patches reusable profile fields and maps the response", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fetchStub = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });

    return new Response(
      JSON.stringify({
        id: "user-1",
        email: "user@example.com",
        full_name: "Witness User",
        tier: "pro",
        consciousness_level: 3,
        experience_points: 144,
        birth_date: "1991-08-24",
        birth_time: "03:45:00",
        birth_location: {
          lat: 12.9716,
          lng: 77.5946,
          name: "Bengaluru, India",
        },
        timezone: "Asia/Kolkata",
        preferences: {
          precision: "high",
          default_workflow: "daily-practice",
        },
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const profile = await updateUserProfile(
    {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test_key",
    },
    {
      fullName: "Witness User",
      birthDate: "1991-08-24",
      birthTime: "03:45:00",
      birthLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
        name: "Bengaluru, India",
      },
      timezone: "Asia/Kolkata",
      preferences: {
        precision: "high",
        default_workflow: "daily-practice",
      },
    },
    fetchStub,
  );

  assert.equal(
    calls[0]?.url,
    "https://selemene.tryambakam.space/api/v1/users/me",
  );
  assert.equal(calls[0]?.init?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    full_name: "Witness User",
    birth_date: "1991-08-24",
    birth_time: "03:45:00",
    birth_location_lat: 12.9716,
    birth_location_lng: 77.5946,
    birth_location_name: "Bengaluru, India",
    timezone: "Asia/Kolkata",
    preferences: {
      precision: "high",
      default_workflow: "daily-practice",
    },
  });
  assert.equal(profile.birthLocation?.latitude, 12.9716);
  assert.equal(profile.birthLocation?.name, "Bengaluru, India");
  assert.equal(profile.preferences.default_workflow, "daily-practice");
});
