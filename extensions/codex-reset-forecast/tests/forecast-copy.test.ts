import { describe, expect, it } from "vitest";
import validFixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse, type ForecastResponse } from "../src/api/forecast-schema";
import { forecastNarrative, historyDetailMarkdown } from "../src/domain/forecast-copy";

const baseForecast = parseForecastResponse(validFixture);

function responseWith(score: number, resetAnnounced = false): ForecastResponse {
  return {
    ...baseForecast,
    forecast: {
      ...baseForecast.forecast,
      score,
      resetAnnounced,
    },
  };
}

describe("forecast narrative", () => {
  it("mirrors the website copy during the post-reset cooldown", () => {
    const narrative = forecastNarrative(baseForecast, new Date("2026-08-11T18:28:16.000Z"));

    expect(narrative).toEqual({
      advice: "Tibo already pressed it. Spend responsibly, or do not.",
      summary:
        "The latest Codex quota reset was confirmed 18h ago. The cooldown now outweighs the incident weather.",
      title: "It already reset.",
    });
  });

  it("prioritizes an announced reset", () => {
    expect(forecastNarrative(responseWith(100, true), new Date("2026-08-13T00:28:16.000Z"))).toEqual({
      advice: "Treat the forecast as certain, but do not count the new quota until it lands.",
      summary:
        "Tibo announced a Codex rate-limit reset in the next 48 hours. It has not happened yet, so the reset clock and cooldown have not moved.",
      title: "Reset announced.",
    });
  });

  it.each([
    [72, "Use it or potentially lose it."],
    [48, "Worth a tactical token burn."],
    [26, "Do not force it."],
    [25, "Probably not today."],
  ])("uses the website score bands after the cooldown for %i%%", (score, title) => {
    expect(forecastNarrative(responseWith(score), new Date("2026-08-13T00:28:16.000Z")).title).toBe(title);
  });
});

describe("history detail markdown", () => {
  it("recovers a bullet list from a flattened source-post divider", () => {
    const entry = {
      ...baseForecast.history[0],
      changes: [
        {
          delta: 10,
          label: "OpenAI event hint",
          details: [
            {
              action: "Source post",
              name: "Intro with **literal emphasis**. ===== - First item. - Second item.",
              url: "https://example.com/post",
            },
          ],
        },
      ],
    };

    expect(historyDetailMarkdown(entry)).toContain(
      [
        "### Source Post",
        "",
        "> Intro with &#42;&#42;literal emphasis&#42;&#42;&#46;",
        ">",
        "> - First item&#46;",
        "> - Second item&#46;",
      ].join("\n"),
    );
    expect(historyDetailMarkdown(entry)).not.toContain("=====");
  });

  it("keeps ordinary source-post text as escaped prose", () => {
    const markdown = historyDetailMarkdown(baseForecast.history[0]);

    expect(markdown).toContain("### Source Post\n\n> Usage limits have been reset&#46;");
  });

  it("renders an expired tweet as a source post and restores flattened code fences", () => {
    const entry = {
      ...baseForecast.history[0],
      changes: [
        {
          delta: -10,
          label: "OpenAI event hint",
          details: [
            {
              action: "Signal expired after 48h",
              kind: "tweet",
              name: [
                "Open ~/.codex/config.toml before any [section] headers:",
                '``` model = "gpt-5.6-sol" model_context_window = 1000000 model_auto_compact_token_limit = 900000 ```',
                "For one CLI session:",
                "``` codex -m gpt-5.6-sol \\ -c model_context_window=1000000 \\ -c model_auto_compact_token_limit=900000 ```",
              ].join(" "),
              url: "https://x.com/example/status/3",
            },
            {
              action: "Why it counted",
              name: 'Matched event language: "million".',
            },
          ],
        },
      ],
    };

    const markdown = historyDetailMarkdown(entry);

    expect(markdown).toContain("### Source Post\n\n**Signal expired after 48h**\n\n> Open");
    expect(markdown).toContain("Open &#126;/&#46;codex/config&#46;toml before any &#91;section&#93; headers:");
    expect(markdown).toContain(
      [
        "> ```",
        '> model = "gpt-5.6-sol"',
        "> model_context_window = 1000000",
        "> model_auto_compact_token_limit = 900000",
        "> ```",
      ].join("\n"),
    );
    expect(markdown).toContain(
      [
        "> ```",
        "> codex -m gpt-5.6-sol \\",
        "> -c model_context_window=1000000 \\",
        "> -c model_auto_compact_token_limit=900000",
        "> ```",
      ].join("\n"),
    );
    expect(markdown).toContain('**Why it counted:** Matched event language: "million"&#46;');
    expect(markdown).not.toContain("\\[");
    expect(markdown).not.toContain("\\.");
    expect(markdown).not.toContain("\\-");
    expect(markdown).not.toContain("**Signal expired after 48h:**");
  });
});
