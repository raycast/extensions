import { describe, expect, it } from "vitest";
import {
  finalizeReplacement,
  finalizeWindowText,
  looksLikeRefusal,
  stripPreamble,
  stripSpeakerLabel,
  stripWrappingQuotes,
} from "./output";

describe("stripPreamble", () => {
  it("removes a lead-in line", () => {
    expect(stripPreamble("Here is the rewritten text:\n\nHello there.")).toBe("Hello there.");
    expect(stripPreamble("Sure! Here's a more professional version:\nHello.")).toBe("Hello.");
    expect(stripPreamble("Here’s the rewritten text:\nHi.")).toBe("Hi.");
  });

  it("removes a same-line label", () => {
    expect(stripPreamble("Rewritten text: Hello.")).toBe("Hello.");
  });

  it("leaves non-preamble text alone", () => {
    expect(stripPreamble("Here is how it works:\nStep 1")).toBe("Here is how it works:\nStep 1");
    expect(stripPreamble("Hello.\nHere is the text:")).toBe("Hello.\nHere is the text:");
  });
});

describe("stripWrappingQuotes", () => {
  it("removes quotes the model added", () => {
    expect(stripWrappingQuotes('"Hello there."', "hey there")).toBe("Hello there.");
    expect(stripWrappingQuotes("“Hello there.”", "hey there")).toBe("Hello there.");
  });

  it("keeps quotes when the input was quoted", () => {
    expect(stripWrappingQuotes('"Hello there."', '"hey there"')).toBe('"Hello there."');
  });

  it("keeps quotes that do not wrap the whole text", () => {
    expect(stripWrappingQuotes('"Yes" or "No"', "yes or no")).toBe('"Yes" or "No"');
    expect(stripWrappingQuotes("“Yes” or “No”", "yes or no")).toBe("“Yes” or “No”");
  });
});

describe("looksLikeRefusal", () => {
  it("detects refusals", () => {
    expect(looksLikeRefusal("I'm sorry, but I can't help with that.")).toBe(true);
    expect(looksLikeRefusal("I’m sorry, but I can’t help with that.")).toBe(true);
    expect(looksLikeRefusal("I cannot assist with this request.")).toBe(true);
    expect(looksLikeRefusal("I'm sorry, but I can't help with your request.")).toBe(true);
    expect(looksLikeRefusal("I apologize, but I can't help with that.")).toBe(true);
    expect(looksLikeRefusal("I apologize, but I cannot fulfill this request.")).toBe(true);
    expect(looksLikeRefusal("Unfortunately, I can't assist with that.")).toBe(true);
  });

  it("ignores legitimate rewrites", () => {
    expect(looksLikeRefusal("I'm sorry, but I can't make it tomorrow.")).toBe(false);
    expect(looksLikeRefusal("I'm unable to do Friday.")).toBe(false);
    expect(looksLikeRefusal("Unfortunately, the meeting moved to Friday.")).toBe(false);
    expect(looksLikeRefusal("Unfortunately, we cannot fulfill your order until Monday.")).toBe(false);
    expect(looksLikeRefusal("Thanks for the update.")).toBe(false);
    expect(looksLikeRefusal("I'm sorry, but I can't help with the move on Saturday.")).toBe(false);
  });
});

describe("stripSpeakerLabel", () => {
  it("removes an assistant label", () => {
    expect(stripSpeakerLabel("Assistant: Hi")).toBe("Hi");
  });
});

describe("finalizeReplacement", () => {
  it("cleans a replacement", () => {
    expect(finalizeReplacement("Here is the rewritten text:\nHi there.\n", "hey there")).toEqual({
      ok: true,
      text: "Hi there.",
    });
  });

  it("strips a preamble after leading whitespace", () => {
    expect(finalizeReplacement(" Here is the rewritten text:\nHi there.", "hey there")).toEqual({
      ok: true,
      text: "Hi there.",
    });
    expect(finalizeReplacement("\nHere is the rewritten text:\nHi there.", "hey there")).toEqual({
      ok: true,
      text: "Hi there.",
    });
  });

  it("keeps an apologetic rewrite", () => {
    expect(
      finalizeReplacement(
        "I'm sorry, but I can't help with the move on Saturday.",
        "sorry cant help with the move saturday",
      ),
    ).toEqual({ ok: true, text: "I'm sorry, but I can't help with the move on Saturday." });
  });

  it("keeps the input trailing newline", () => {
    expect(finalizeReplacement("Hi there.\n", "hey there\n")).toEqual({ ok: true, text: "Hi there.\n" });
  });

  it("reports empty output", () => {
    expect(finalizeReplacement("  \n", "x")).toEqual({ ok: false, reason: "empty", text: "" });
  });

  it("reports refusals", () => {
    expect(finalizeReplacement("I'm sorry, but I can't help with that.", "x")).toMatchObject({
      ok: false,
      reason: "refusal",
    });
  });
});

describe("finalizeWindowText", () => {
  it("strips the preamble and trims", () => {
    expect(finalizeWindowText("Here is the summary:\nShort.\n")).toBe("Short.");
    expect(finalizeWindowText("\n Here is the summary:\nShort.\n")).toBe("Short.");
  });
});
