import { describe, expect, test } from "bun:test";
import {
  addSadaqahSchema,
  createBoxSchema,
  presetFormSchema,
  updateBoxSchema,
  validateInput,
} from "../src/validation/schemas";

describe("validation schemas", () => {
  test("createBoxSchema trims name and omits blank description", () => {
    const result = validateInput(createBoxSchema, {
      name: "  Ramadan Box  ",
      description: "   ",
      baseCurrencyId: "",
    });
    expect(result).toEqual({
      success: true,
      data: { name: "Ramadan Box", description: undefined, baseCurrencyId: "" },
    });
  });

  test("updateBoxSchema preserves empty string description so it can be cleared", () => {
    const result = validateInput(updateBoxSchema, {
      name: "Updated",
      description: "   ",
    });
    expect(result).toEqual({
      success: true,
      data: { name: "Updated", description: "" },
    });
  });

  test("addSadaqahSchema rejects partial numeric strings and empty inputs", () => {
    const invalidPartial = validateInput(addSadaqahSchema, {
      value: "10abc",
      amount: "2.5",
      currencyId: "",
    });
    expect(invalidPartial.success).toBe(false);
    if (!invalidPartial.success) {
      expect(invalidPartial.fieldErrors.value).toBe("Value must be a positive number");
      expect(invalidPartial.fieldErrors.amount).toBe("Amount must be a positive whole number");
    }

    const empty = validateInput(addSadaqahSchema, { value: "", amount: "", currencyId: "" });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.fieldErrors.value).toBe("Either amount or value is required");
    }
  });

  test("presetFormSchema validates string numbers and returns fieldErrors", () => {
    const invalid = validateInput(presetFormSchema, {
      name: "  ",
      value: "",
      amount: "0",
      currencyId: "cur_usd",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.fieldErrors.name).toBe("Name is required");
      expect(invalid.fieldErrors.value).toBe("Value is required");
      expect(invalid.fieldErrors.amount).toBe("Amount must be a positive whole number");
    }

    const valid = validateInput(presetFormSchema, {
      name: " Daily ",
      value: "5.5",
      amount: "2",
      currencyId: "cur_usd",
    });
    expect(valid).toEqual({
      success: true,
      data: { name: "Daily", value: 5.5, amount: 2, currencyId: "cur_usd" },
    });
  });
});
