import { describe, expect, test } from "vitest";

import type { Term } from "../utils/types";
import { glossaryReducer, type GlossaryReducerState } from "./glossary-reducer";

const terms: readonly Term[] = [{ definition: "Application Programming Interface", term: "API" }];

describe("glossaryReducer", () => {
  test("changes the query without discarding ready terms", () => {
    const state: GlossaryReducerState = { query: "a", state: { status: "ready", terms } };

    expect(glossaryReducer(state, { query: "ap", type: "queryChanged" })).toEqual({
      query: "ap",
      state: { status: "ready", terms },
    });
  });

  test("starts loading without clearing the query", () => {
    const state: GlossaryReducerState = { query: "api", state: { status: "ready", terms } };

    expect(glossaryReducer(state, { type: "loadStarted" })).toEqual({
      query: "api",
      state: { status: "loading" },
    });
  });

  test("stores loaded terms without clearing the query", () => {
    const state: GlossaryReducerState = { query: "api", state: { status: "loading" } };

    expect(glossaryReducer(state, { terms, type: "loadSucceeded" })).toEqual({
      query: "api",
      state: { status: "ready", terms },
    });
  });

  test("stores a safe loading error without clearing the query", () => {
    const state: GlossaryReducerState = { query: "api", state: { status: "loading" } };

    expect(glossaryReducer(state, { message: "Invalid glossary", type: "loadFailed" })).toEqual({
      query: "api",
      state: { message: "Invalid glossary", status: "error" },
    });
  });
});
