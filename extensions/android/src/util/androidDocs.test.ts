import { describe, test } from "node:test";
import { expect } from "./expect";
import { parseDocsSearch, parseDocsFetch, toDeveloperUrl } from "./androidDocs";

// Captured verbatim from `android docs search "jetpack compose state"`.
const REAL_SEARCH_OUTPUT = `Waiting for index to be ready...
Searching docs for: jetpack compose state
1. State in Jetpack Compose
   URL: kb://android/develop/ui/compose/state
   This document explains what state is in an Android app, how to manage it in Jetpack Compose using AP...

2. State Hoisting in Jetpack Compose
   URL: kb://android/develop/ui/compose/state-hoisting
   This document explains the best practices for hoisting UI state in Jetpack Compose applications, det...

3. State in Compose
   URL: kb://android/develop/ui/compose/quick-guides/content/video/state-in-compose
   Learn how state flows through your Compose-based app and how the framework can automatically update ...

4. State holders and UI state
   URL: kb://android/topic/architecture/ui-layer/stateholders
   This document details state holders in the Android UI layer, explaining their role in managing UI st...
`;

// Captured verbatim from `android docs fetch "kb://android/develop/ui/compose/state"`.
const REAL_FETCH_OUTPUT = `Waiting for index to be ready...
Fetching docs from: kb://android/develop/ui/compose/state
Title: State in Jetpack Compose
URL: kb://android/develop/ui/compose/state
----------------------------------------
[Video](https://www.youtube.com/watch?v=mymWGMy9pYI)

State in an app is any value that can change over time.

## State and composition

See [Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model).
`;

describe("parseDocsSearch", () => {
  test("Given real search stdout, When parsed, Then preamble is skipped and every result is captured", () => {
    const results = parseDocsSearch(REAL_SEARCH_OUTPUT);

    expect(results).toHaveLength(4);
    expect(results[0]).toEqual({
      title: "State in Jetpack Compose",
      url: "kb://android/develop/ui/compose/state",
      snippet:
        "This document explains what state is in an Android app, how to manage it in Jetpack Compose using AP...",
    });
    expect(results[3]).toEqual({
      title: "State holders and UI state",
      url: "kb://android/topic/architecture/ui-layer/stateholders",
      snippet:
        "This document details state holders in the Android UI layer, explaining their role in managing UI st...",
    });
  });

  test("Given output with no numbered results, When parsed, Then returns an empty list", () => {
    expect(
      parseDocsSearch("Waiting for index to be ready...\nNo results found.\n")
    ).toEqual([]);
  });
});

describe("parseDocsFetch", () => {
  test("Given real fetch stdout, When parsed, Then title, url and markdown body are separated", () => {
    const article = parseDocsFetch(REAL_FETCH_OUTPUT);

    expect(article.title).toBe("State in Jetpack Compose");
    expect(article.url).toBe("kb://android/develop/ui/compose/state");
    expect(
      article.body.startsWith(
        "[Video](https://www.youtube.com/watch?v=mymWGMy9pYI)"
      )
    ).toBe(true);
    expect(article.body).toContain(
      "[Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model)"
    );
    // Preamble and the dashed separator must not leak into the rendered body.
    expect(article.body).not.toContain("Waiting for index");
    expect(article.body).not.toContain("Fetching docs from");
    expect(article.body).not.toContain(
      "----------------------------------------"
    );
  });
});

describe("toDeveloperUrl", () => {
  test("Given an android kb:// url, When converted, Then it points at developer.android.com", () => {
    expect(toDeveloperUrl("kb://android/develop/ui/compose/state")).toBe(
      "https://developer.android.com/develop/ui/compose/state"
    );
    expect(
      toDeveloperUrl("kb://android/topic/architecture/ui-layer/stateholders")
    ).toBe(
      "https://developer.android.com/topic/architecture/ui-layer/stateholders"
    );
  });

  test("Given a non-android kb:// host (e.g. JetBrains KMP docs), When converted, Then there is no developer.android.com page", () => {
    // Real search results include hosts like kb://JetBrains/... which must NOT
    // be force-fit onto developer.android.com (that would 404).
    expect(
      toDeveloperUrl(
        "kb://JetBrains/kotlin-multiplatform-dev-docs/topics/compose/compose-navigation"
      )
    ).toBeUndefined();
  });
});
