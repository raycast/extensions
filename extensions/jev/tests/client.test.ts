import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluate } from "../src/lib/client";
import { destinationQuestion, type WireQuestion } from "../src/lib/questions";

afterEach(() => vi.unstubAllGlobals());

function mockService(answers: Record<string, unknown>) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify({ model: "jev-test", answers }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("structured TypeSafe requests", () => {
  it("sends the document suggestion state and validates the folder answer", async () => {
    const state = { filename: "receipt.txt", text: "Synthetic receipt\nItem: Notebook\nTotal: €12.50" };
    const questions = {
      destination: destinationQuestion([
        { id: "receipts", name: "Receipts", description: "Purchase receipts", kind: "folder", path: "/receipts" },
      ]),
    };
    const answer = {
      type: "choice",
      choice: "receipts",
      confidence: 0.95,
      probabilities: { receipts: 0.95, none: 0.05 },
    };
    const fetch = mockService({ destination: answer });

    const result = await evaluate("test-key", "jev-latest", state, questions);

    const payload = JSON.parse(fetch.mock.calls[0]![1]!.body as string);
    expect(payload.state).toEqual(state);
    expect(payload.questions).toEqual(questions);
    expect(result.answers.destination).toEqual(answer);
  });

  it("sends the semantic bookmark query with nested link metadata", async () => {
    const state = {
      query: "TypeSafe SDK documentation",
      links: [
        {
          title: "TypeSafe Docs",
          url: "https://docs.typesafe.ai/sdk/javascript",
          description: "JavaScript SDK documentation",
          tags: ["reference", "typescript"],
          folder: "Development/Documentation",
        },
      ],
    };
    const questions: Record<string, WireQuestion> = {
      l0: {
        type: "noul",
        instructions: "Does state.links[0] match the search intent in state.query?",
      },
    };
    const fetch = mockService({ l0: { type: "noul", noul: 0.9 } });

    const result = await evaluate("test-key", "jev-latest", state, questions);

    const payload = JSON.parse(fetch.mock.calls[0]![1]!.body as string);
    expect(payload.state).toEqual(state);
    expect(payload.questions).toEqual(questions);
    expect(result.answers.l0).toEqual({ type: "noul", noul: 0.9 });
  });

  it("preserves plain text without adding JSON quotes or escaping", async () => {
    const state = 'App closes after clicking "Save".\nExpected: save the note. Café.';
    const fetch = mockService({ check: { type: "noul", noul: 0.9 } });

    await evaluate("test-key", "jev-latest", state, { check: { type: "noul", instructions: "Is this a bug report?" } });

    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string).state).toBe(state);
  });

  it("rejects an oversized structured state before contacting TypeSafe", async () => {
    const fetch = mockService({});

    await expect(
      evaluate("test-key", "jev-latest", { filename: "large.txt", text: "x".repeat(100000) }, {}),
    ).rejects.toThrow("too large");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects credentials nested inside bookmark metadata before contacting TypeSafe", async () => {
    const fetch = mockService({});
    const state = {
      query: "documentation",
      links: [{ title: "Private API", url: "https://example.com", description: "apikey_" + "synthetic".repeat(8) }],
    };

    await expect(evaluate("test-key", "jev-latest", state, {})).rejects.toThrow("credential");
    expect(fetch).not.toHaveBeenCalled();
  });
});
