import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEngineResultMarkdown,
  buildReadingResultMarkdown,
  buildWorkflowResultMarkdown,
  getReadingStructuredKeys,
  hasReadingRequestContext,
  listStructuredKeys,
} from "./execution-result-presenter";
import {
  EngineExecutionResult,
  ReadingSummary,
  WorkflowExecutionResult,
} from "./types";

test("buildEngineResultMarkdown turns nested engine payloads into readable sections", () => {
  const result: EngineExecutionResult = {
    engineId: "vedic-clock",
    witnessPrompt: "Triple Warmer fire is balancing the sleep transition.",
    consciousnessLevel: 2,
    timestamp: "2026-04-22T15:30:00Z",
    metadata: {
      calculation_time_ms: 6,
      cache_state: "fresh",
    },
    result: {
      current_organ: {
        organ: "TripleWarmer",
        time_window: "9 PM - 11 PM",
      },
      current_dosha: {
        dosha: "Kapha",
      },
      synthesis:
        "Triple Warmer time during Kapha period balances sleep energy.",
      recommendations: [
        {
          activity: "Light reading",
          quality: "neutral",
          reason: "Balancing all body systems before sleep",
        },
      ],
      timezone: {
        local_hour: 21,
        offset_minutes: 330,
      },
    },
    raw: {
      engine_id: "vedic-clock",
      result: {
        current_organ: {
          organ: "TripleWarmer",
        },
      },
    },
  };

  const markdown = buildEngineResultMarkdown("Vedic Clock Result", result, {
    requestPayload: {
      birth_data: {
        date: "1991-08-13",
        time: "13:31",
        timezone: "Asia/Kolkata",
      },
      precision: "Standard",
    },
  });

  assert.match(markdown, /## Current Pulse/);
  assert.match(markdown, /\| Signal \| Value \|/);
  assert.match(markdown, /\| Organ \| TripleWarmer \|/);
  assert.match(markdown, /## Reading Brief/);
  assert.match(markdown, /- Current organ: TripleWarmer/);
  assert.match(markdown, /## Request Context/);
  assert.match(markdown, /### Recommendations/);
  assert.match(markdown, /\*\*Recommendation 1\*\*/);
  assert.match(markdown, /### Timezone/);
  assert.match(markdown, /## Response Metadata/);
  assert.doesNotMatch(markdown, /## Raw Response Preview/);
});

test("buildEngineResultMarkdown renders tarot spreads as readable card sections", () => {
  const result: EngineExecutionResult = {
    engineId: "tarot",
    witnessPrompt:
      'How do these cards speak to your question: "the current plantery transits analysis"?',
    consciousnessLevel: 0,
    metadata: {
      calculation_time_ms: 3,
    },
    result: {
      question: "the current plantery transits analysis",
      spread: {
        name: "Celtic Cross",
        type: "celtic_cross",
        description:
          "A comprehensive 10-card spread providing deep insight into a situation",
      },
      positions: [
        {
          name: "Present",
          position: 0,
          meaning: "The heart of the matter; your current situation",
          card: {
            name: "The World",
            arcana: "major",
            element: "earth",
            isReversed: false,
            interpretation: {
              meaning: "Completion, integration, accomplishment, travel",
              keywords: ["completion", "wholeness", "achievement"],
            },
          },
        },
        {
          name: "Challenge",
          position: 1,
          meaning: "What crosses you; the immediate challenge or obstacle",
          card: {
            name: "Queen of Swords",
            arcana: "minor",
            element: "air",
            suit: "swords",
            isReversed: true,
            interpretation: {
              meaning: "Overly emotional, easily influenced, cold-hearted",
              keywords: ["independence", "clarity"],
            },
          },
        },
        {
          name: "Foundation",
          position: 2,
          meaning: "The root of the situation; what lies beneath",
          card: {
            name: "The Moon",
            arcana: "major",
            element: "water",
            isReversed: true,
            interpretation: {
              meaning: "Release of fear, repressed emotion, inner confusion",
              keywords: ["illusion", "intuition"],
            },
          },
        },
        {
          name: "Recent Past",
          position: 3,
          meaning: "What is passing away; recent influences",
          card: {
            name: "The Emperor",
            arcana: "major",
            element: "fire",
            isReversed: false,
            interpretation: {
              meaning: "Authority, structure, control, fatherhood, stability",
              keywords: ["authority", "structure"],
            },
          },
        },
        {
          name: "Near Future",
          position: 4,
          meaning: "What lies ahead; influences entering your life",
          card: {
            name: "Nine of Cups",
            arcana: "minor",
            element: "water",
            suit: "cups",
            isReversed: false,
            interpretation: {
              meaning: "Contentment, satisfaction, gratitude, wish come true",
              keywords: ["contentment", "gratitude"],
            },
          },
        },
      ],
    },
    raw: {
      engine_id: "tarot",
    },
  };

  const markdown = buildEngineResultMarkdown("Tarot Result", result, {
    requestPayload: {
      options: {
        question: "the current plantery transits analysis",
        spread: "celtic_cross",
      },
    },
  });

  assert.match(markdown, /## Spread Overview/);
  assert.match(markdown, /\| Spread \| Celtic Cross \|/);
  assert.match(markdown, /- Spread: Celtic Cross/);
  assert.match(markdown, /- Cards drawn: 5/);
  assert.match(markdown, /### Cards Drawn/);
  assert.match(markdown, /#### 1\. Present/);
  assert.match(markdown, /- Card: The World/);
  assert.match(markdown, /- Orientation: Reversed/);
  assert.match(markdown, /#### 5\. Near Future/);
  assert.match(markdown, /- Keywords: Completion, Wholeness, Achievement/);
  assert.doesNotMatch(markdown, /field\(s\)/);
  assert.doesNotMatch(markdown, /more item\(s\) not shown/);
});

test("buildWorkflowResultMarkdown organizes synthesis and per-engine outputs", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 25.4,
    timestamp: "2026-04-22T15:40:00Z",
    synthesis: {
      summary: "A reflective and disciplined day.",
      recommendation: "Favor quieter work and closing loops.",
    },
    engineOutputs: {
      panchanga: {
        engineId: "panchanga",
        witnessPrompt: "Observe the fasting current.",
        result: {
          tithi: "Ekadashi",
        },
        metadata: {
          calculation_time_ms: 12.5,
        },
        raw: {},
      },
      numerology: {
        engineId: "numerology",
        witnessPrompt: "Completion energy is dominant.",
        consciousnessLevel: 4,
        result: {
          life_path: 9,
        },
        metadata: {
          calculation_time_ms: 8.1,
        },
        raw: {},
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const markdown = buildWorkflowResultMarkdown(
    "Daily Practice Result",
    result,
    {
      precision: "Standard",
      options: {
        mode: "daily",
      },
    },
  );

  assert.match(markdown, /## Run Brief/);
  assert.match(markdown, /- Engine outputs returned: 2/);
  assert.match(markdown, /## Synthesis Map/);
  assert.match(markdown, /### Panchanga/);
  assert.match(markdown, /Observe the fasting current\./);
  assert.match(markdown, /### Numerology/);
  assert.doesNotMatch(markdown, /## Raw Response Preview/);
});

test("buildReadingResultMarkdown reuses the interpreted presenter for cached readings", () => {
  const reading: ReadingSummary = {
    id: "reading-1",
    engineId: "biorhythm",
    workflowId: undefined,
    inputHash: "hash-1",
    witnessPrompt: "Track the energy curve.",
    consciousnessLevel: 3,
    calculationTimeMs: 18.5,
    createdAt: "2026-04-22T16:00:00Z",
    fetchedAt: "2026-04-22T16:05:00Z",
    payload: {
      id: "reading-1",
      engine_id: "biorhythm",
      witness_prompt: "Track the energy curve.",
      consciousness_level: 3,
      calculation_time_ms: 18.5,
      created_at: "2026-04-22T16:00:00Z",
      birth_data: {
        date: "1991-08-13",
      },
      precision: "High",
      result_data: {
        overall_energy: 72,
        physical: { percentage: 81, phase: "Rising" },
        emotional: { percentage: 68, phase: "Stable" },
        intellectual: { percentage: 67, phase: "Steady" },
      },
    },
  };

  const markdown = buildReadingResultMarkdown(reading, true);

  assert.match(markdown, /biorhythm/i);
  assert.match(markdown, /## Energy Signature/);
  assert.match(markdown, /\| Overall \| 72% \|/);
  assert.match(markdown, /## Request Context/);
  assert.match(markdown, /## Result Map/);
  assert.deepEqual(getReadingStructuredKeys(reading), [
    "Overall Energy",
    "Physical",
    "Emotional",
    "Intellectual",
  ]);
  assert.equal(hasReadingRequestContext(reading), true);
});

test("listStructuredKeys returns humanized top-level keys", () => {
  assert.deepEqual(
    listStructuredKeys({ current_organ: {}, total_time_ms: 10 }),
    ["Current Organ", "Total Time Ms"],
  );
});
