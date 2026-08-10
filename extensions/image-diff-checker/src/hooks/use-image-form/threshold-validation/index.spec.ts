import { expect, test, describe } from "vitest";
import { thresholdValidation } from "./index";

const ERRORS = {
  required: "The threshold is required.",
  number: "The threshold must be a number.",
};

describe("required", () => {
  test("should return required error for undefined", () => {
    expect(thresholdValidation(undefined)).toBe(ERRORS.required);
  });

  test("should return required error for empty string", () => {
    expect(thresholdValidation("")).toBe(ERRORS.required);
  });
});
