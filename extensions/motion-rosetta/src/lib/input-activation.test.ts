import { expect, it } from "vitest";
import { InputActivation } from "./input-activation.ts";
it("activates the initial valid selection without onSelectionChange, ignoring its later text echo", () => {
  const input = new InputActivation();
  expect(input.accept("0.42, 0, 0.58, 1", true)).toEqual({
    duplicate: false,
    initial: true,
    preview: true,
  });
  expect(input.accept("0.42, 0, 0.58, 1", true)).toEqual({
    duplicate: true,
    initial: false,
    preview: false,
  });
  expect(input.accept("0.42, 0, 0.58, 0.9", true).initial).toBe(false);
  input.accept("", false);
  expect(input.accept("linear(0, 1)", true).initial).toBe(true);
});
it("requests a preview for subsequent valid searches and after invalid partial input", () => {
  const input = new InputActivation();
  input.accept("ease-out", true);
  expect(input.accept("ease-in", true)).toEqual({
    duplicate: false,
    initial: false,
    preview: true,
  });
  expect(input.accept("linear(", false).preview).toBe(false);
  expect(input.accept("linear(0, 1)", true).preview).toBe(true);
  // Replacing the search with a retimed physical spring schedules once;
  // the controlled-search echo must not cancel its pending request.
  expect(
    input.accept('{"type":"spring","stiffness":100,"damping":10}', true)
      .preview,
  ).toBe(true);
  expect(
    input.accept('{"type":"spring","stiffness":100,"damping":10}', true)
      .duplicate,
  ).toBe(true);
});
