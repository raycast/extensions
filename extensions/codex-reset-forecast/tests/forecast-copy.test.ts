import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse } from "../src/api/forecast-schema";
import {
  escapeMarkdown,
  forecastSummary,
  historyDetailMarkdown,
  outlookMarkdown,
  sourceText,
} from "../src/domain/forecast-copy";
import { resetHistory } from "../src/domain/reset-history";

const response = parseForecastResponse(fixture);

describe("source-faithful copy", () => {
  it("shows the source explanation and both probabilities without old forecast advice", () => {
    const markdown = outlookMarkdown(response);
    expect(markdown).toContain("24% within 24 hours");
    expect(markdown).toContain("43% within 48 hours");
    expect(markdown).toContain("empirical hazard");
    expect(markdown).not.toContain("WHAT TO DO");
    expect(forecastSummary(response)).toContain("https://codexreset.org/");
  });
  it("renders evidence and verification details together", () => {
    const markdown = historyDetailMarkdown(resetHistory(response)[0]);
    expect(markdown).toContain("All reset for everyone");
    expect(markdown).toContain("completed shared/global quota reset");
    expect(markdown).toContain("Confirmed Reset");
  });
  it("preserves line breaks and literal punctuation in Raycast Markdown", () => {
    expect(sourceText("First\\n\\nSecond")).toBe("First\n\nSecond");
    expect(escapeMarkdown("[section] $x$ ~test~")).toBe("&#91;section&#93; &#36;x&#36; &#126;test&#126;");
    const item = resetHistory(response)[0];
    const markdown = historyDetailMarkdown({
      ...item,
      evidence: { ...item.evidence!, summary: "[section]\\nvalue = 1" },
    });
    expect(markdown).toContain("> &#91;section&#93;  \n> value = 1");
  });
});
