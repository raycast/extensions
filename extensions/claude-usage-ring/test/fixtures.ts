export const SAMPLE = {
  five_hour: {
    utilization: 8.0,
    resets_at: "2026-11-02T16:30:00.380120+00:00",
    limit_dollars: null,
    used_dollars: null,
    remaining_dollars: null,
    locked_reason: null,
  },
  seven_day: {
    utilization: 6.0,
    resets_at: "2026-11-07T19:00:00.380139+00:00",
    limit_dollars: null,
    used_dollars: null,
    remaining_dollars: null,
    locked_reason: null,
  },
  seven_day_opus: null,
  seven_day_sonnet: null,
  seven_day_oauth_apps: null,
  seven_day_cowork: null,
  some_codename: null,
};

export const ALL_NULL = { five_hour: null, seven_day: null, seven_day_opus: null, seven_day_sonnet: null };

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
