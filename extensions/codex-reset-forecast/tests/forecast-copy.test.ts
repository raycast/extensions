import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import forecast from "./fixtures/forecast-api.json";
import timeline from "./fixtures/timeline-api.json";
import { parseForecastResponse, parseSourceResponses } from "../src/api/forecast-schema";
import {
  alertMarkdown,
  alertTitle,
  escapeMarkdown,
  forecastSummary,
  historyDetailMarkdown,
  historySummary,
  outlookMarkdown,
  sourceText,
} from "../src/domain/forecast-copy";
import { resetHistory } from "../src/domain/reset-history";

const response = parseForecastResponse(fixture);
describe("source-faithful copy", () => {
  it("shows probabilities, confidence and linked attribution on every detail and export", () => {
    const markdown = outlookMarkdown(response);
    expect(markdown).toContain("24% within 24 hours");
    expect(markdown).toContain("43% within 48 hours");
    expect(markdown).toContain("Model confidence");
    expect(markdown).toContain("No active reset watch");
    for (const text of [
      markdown,
      forecastSummary(response),
      historyDetailMarkdown(response.history[0]),
      historySummary(response.history[0]),
    ])
      expect(text).toContain("https://codex-reset.com/");
  });
  it("distinguishes provider observations from official confirmation", () => {
    const alert = parseSourceResponses(forecast, timeline).forecast!.latestAlert!;
    expect(alertTitle(alert)).toBe("Reset");
    expect(alertMarkdown(alert)).toContain("Tibo hasn’t posted a confirmation yet");
    expect(alertMarkdown(alert)).toContain("Data: codex-reset.com");
  });
  it("does not present an expired watch as an upcoming reset", () => {
    const alert = {
      ...parseSourceResponses(forecast, timeline).forecast!.latestAlert!,
      kind: "watch" as const,
      state: "expired" as const,
      observation_message: null,
    };
    expect(alertTitle(alert)).toBe("Expired Watch");
    expect(alertMarkdown(alert)).toContain("**State** · expired");
  });
  it("preserves line breaks and literal punctuation in Raycast Markdown", () => {
    expect(sourceText("First\\n\\nSecond")).toBe("First\n\nSecond");
    expect(escapeMarkdown("[section] $x$ ~test~")).toBe("&#91;section&#93; &#36;x&#36; &#126;test&#126;");
    expect(escapeMarkdown("https://t.co/post")).toBe("https&#58;//t&#46;co/post");
    expect(historyDetailMarkdown({ ...resetHistory(response)[0], description: "[section]\\nvalue = 1" })).toContain(
      "&#91;section&#93;  \nvalue = 1",
    );
  });
});
