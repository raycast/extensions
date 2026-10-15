import { describe, expect, it } from "vitest";
import { describePlaneError } from "../src/helpers/errors";

describe("describePlaneError", () => {
  it("maps statuses to hints", () => {
    expect(describePlaneError({ status: 401, message: "x" }).title).toBe("Check your API key");
    expect(describePlaneError({ response: { status: 403 } }).title).toBe("No access");
    expect(describePlaneError(Object.assign(new Error("Given API token is not valid"), { status: 403 })).title).toBe(
      "API key not valid",
    );
    expect(
      describePlaneError(Object.assign(new Error("Given API token is not valid"), { status: 403 })).message,
    ).toContain("Personal Access Tokens");
    expect(
      describePlaneError(Object.assign(new Error("You don't have the required permissions."), { status: 403 })).message,
    ).toContain("required permissions");
    expect(describePlaneError({ status: 404 }).title).toBe("Check API Base Path");
    expect(describePlaneError({ status: 429 }).title).toBe("Plane rate limit reached");
    expect(describePlaneError(new Error("boom")).message).toBe("boom");
  });
});
