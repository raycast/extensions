import { describe, expect, it } from "vitest";
import { useLocalStorage } from "@raycast/utils";

describe("@raycast/utils mock", () => {
  it("returns a destructurable shape from useLocalStorage", () => {
    const result = useLocalStorage("any-key");

    expect(result).toMatchObject({
      value: undefined,
      setValue: expect.any(Function),
      isLoading: false,
    });

    expect(() => {
      const { value, setValue, isLoading } = result;
      expect(value).toBeUndefined();
      expect(setValue).toBeTypeOf("function");
      expect(isLoading).toBe(false);
    }).not.toThrow();
  });
});
