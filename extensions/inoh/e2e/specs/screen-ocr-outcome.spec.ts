/**
 * Narrowing the Raycast Swift bridge's untyped OCR result.
 *
 * Unlike its neighbours here this spec needs no backend. The screen capture
 * itself cannot be driven from a test — it puts a crosshair on screen and
 * waits for a drag — so what is covered is the one piece with branches: the
 * bridge hands back `any`, and every shape it can hand back has to land on a
 * status the command knows how to report.
 */

import { describe, expect, it } from "vitest";
import { narrowScreenOcrOutcome, UNEXPECTED_BRIDGE_RESULT_MESSAGE } from "../../src/lib/screen-ocr-outcome";

describe("narrowScreenOcrOutcome", () => {
  it("keeps recognized text, trimmed", () => {
    expect(narrowScreenOcrOutcome({ status: "recognized", text: "  inscrutable \n", errorMessage: null })).toEqual({
      status: "recognized",
      text: "inscrutable",
    });
  });

  it("reports whitespace-only text as nothing found, so the search bar is never blank", () => {
    expect(narrowScreenOcrOutcome({ status: "recognized", text: "   ", errorMessage: null })).toEqual({
      status: "noTextFound",
    });
  });

  it.each(["cancelled", "noTextFound", "blankCapture"])("passes the %s status through", (status) => {
    expect(narrowScreenOcrOutcome({ status, text: "", errorMessage: null })).toEqual({ status });
  });

  it("carries the Swift error message on a failure", () => {
    expect(narrowScreenOcrOutcome({ status: "failed", text: "", errorMessage: "Vision gave up" })).toEqual({
      status: "failed",
      errorMessage: "Vision gave up",
    });
  });

  it("substitutes a message when a failure arrives without one", () => {
    expect(narrowScreenOcrOutcome({ status: "failed", text: "", errorMessage: null })).toEqual({
      status: "failed",
      errorMessage: UNEXPECTED_BRIDGE_RESULT_MESSAGE,
    });
  });

  it.each([null, undefined, "recognized", 42, [], {}, { status: "somethingNew" }])(
    "fails rather than throws on %j",
    (bridgeResult) => {
      expect(narrowScreenOcrOutcome(bridgeResult)).toEqual({
        status: "failed",
        errorMessage: UNEXPECTED_BRIDGE_RESULT_MESSAGE,
      });
    },
  );
});
