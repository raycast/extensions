import { describe, expect, it } from "vitest";
import { errorDetailMiddleware } from "../src/api/client";
import { PlaneApiError } from "../src/helpers/plane-api-error";
import { describePlaneError } from "../src/helpers/errors";

function context(response: Response) {
  return { fetch, url: "https://plane.example.com/api/v1/users/me/", init: {}, response };
}

describe("errorDetailMiddleware", () => {
  it("passes successful responses through", async () => {
    const response = new Response("{}", { status: 200 });
    expect(await errorDetailMiddleware.post!(context(response))).toBe(response);
  });

  it("turns Plane's invalid-key 403 into a PlaneApiError with the detail", async () => {
    const response = new Response(JSON.stringify({ detail: "Given API token is not valid" }), { status: 403 });
    const error = await errorDetailMiddleware.post!(context(response)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PlaneApiError);
    expect((error as PlaneApiError).status).toBe(403);
    expect((error as PlaneApiError).message).toBe("Given API token is not valid");
    expect(describePlaneError(error).title).toBe("API key not valid");
  });

  it("keeps Retry-After on 429 and falls back to the status text for non-JSON bodies", async () => {
    const response = new Response("Too many", {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Retry-After": "7" },
    });
    const error = (await errorDetailMiddleware.post!(context(response)).catch((e: unknown) => e)) as PlaneApiError;
    expect(error.status).toBe(429);
    expect(error.retryAfter).toBe(7);
    expect(error.message).toBe("Too many");
  });
});
