import { ApiError, ValidationError, toMessage } from "../errors";

describe("toMessage", () => {
  it("returns the message of an ApiError", () => {
    const err = new ApiError("server exploded", 500, "API_ERROR");
    expect(toMessage(err)).toBe("server exploded");
  });

  it("returns the message of a ValidationError", () => {
    const err = new ValidationError("bad host", "INVALID_HOST");
    expect(toMessage(err)).toBe("bad host");
  });

  it("returns the message of a generic Error", () => {
    expect(toMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies non-Error values", () => {
    expect(toMessage("just a string")).toBe("just a string");
    expect(toMessage(42)).toBe("42");
  });
});
