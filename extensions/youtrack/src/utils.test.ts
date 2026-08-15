import type { IssueTag, SearchSuggestion } from "./interfaces";
import { applySearchSuggestion, getTagsToAdd, prepareFavorites, isDurationValid, stripHtmlTags } from "./utils";

const searchSuggestion = (overrides: Partial<SearchSuggestion> = {}): SearchSuggestion => ({
  completionStart: 0,
  completionEnd: 0,
  description: "",
  group: "",
  option: "State",
  prefix: "",
  suffix: ": ",
  ...overrides,
});

describe("applySearchSuggestion", () => {
  test("should insert a suggestion at the completion position", () => {
    expect(
      applySearchSuggestion(
        "State: ",
        searchSuggestion({ completionStart: 7, completionEnd: 7, option: "Open", suffix: "" }),
      ),
    ).toBe("State: Open");
  });

  test("should replace a partial token", () => {
    expect(applySearchSuggestion("Stat", searchSuggestion({ completionEnd: 4 }))).toBe("State: ");
  });

  test("should apply a suggestion prefix and suffix", () => {
    expect(
      applySearchSuggestion(
        "State: Veri",
        searchSuggestion({
          completionStart: 7,
          completionEnd: 11,
          option: "Verified",
          prefix: "{",
          suffix: "}",
        }),
      ),
    ).toBe("State: {Verified}");
  });

  test("should preserve query text outside the completion range", () => {
    const query = "project: TEST Stat created: today";
    const completionStart = query.indexOf("Stat");

    expect(
      applySearchSuggestion(
        query,
        searchSuggestion({ completionStart, completionEnd: completionStart + "Stat".length, suffix: ":" }),
      ),
    ).toBe("project: TEST State: created: today");
  });
});

describe("getTagsToAdd", () => {
  test("should prepare selected tags to 'IssueTag[]' before submitting issue", () => {
    const owner = {
      name: "admin",
      fullName: "admin",
      login: "admin",
      email: "",
      id: "1-1",
    };

    const tagTemplate = {
      owner,
      untagOnResolve: false,
    };
    const selectedTags = ["productivity", "ideas"];
    const stateTags: IssueTag[] = [
      {
        ...tagTemplate,
        name: "productivity",
        id: "7-0",
        color: { id: "1", foreground: "#FFFFFF", background: "#000000" },
      },
      {
        ...tagTemplate,
        name: "ideas",
        id: "7-1",
        color: { id: "1", foreground: "#FFFFFF", background: "#000000" },
      },
      {
        ...tagTemplate,
        name: "myTag",
        id: "7-3",
        color: { id: "1", foreground: "#FFFFFF", background: "#000000" },
      },
    ];

    const result = getTagsToAdd(selectedTags, stateTags);
    expect(result).toHaveLength(2);
    expect(result.map(({ name }) => name)).toEqual(selectedTags);
  });
});

describe("prepareFavorites", () => {
  test("should return projects to fetch", () => {
    const cachedProjects = [{ id: "0-0", shortName: "DEMO", name: "Demo project" }];
    const favorites = ["DEMO", "TEST", "TEST2"];

    const result = prepareFavorites(cachedProjects, favorites);
    expect(result).toEqual({ cached: cachedProjects, toFetch: ["TEST", "TEST2"] });
  });

  test("should not return projects to fetch", () => {
    const cachedProjects = [{ id: "0-0", shortName: "DEMO", name: "Demo project" }];
    const favorites = ["DEMO"];

    const result = prepareFavorites(cachedProjects, favorites);
    expect(result).toEqual({ cached: cachedProjects, toFetch: [] });
  });
});

describe("isDurationValid", () => {
  test("should validate single unit formats", () => {
    expect(isDurationValid("30m")).toBe(true);
    expect(isDurationValid("1h")).toBe(true);
    expect(isDurationValid("2d")).toBe(true);
    expect(isDurationValid("3w")).toBe(true);
  });

  test("should validate combined formats without spaces", () => {
    expect(isDurationValid("1h30m")).toBe(true);
    expect(isDurationValid("1d2h")).toBe(true);
    expect(isDurationValid("1w2d")).toBe(true);
    expect(isDurationValid("1w2d3h45m")).toBe(true);
  });

  test("should validate formats with spaces", () => {
    expect(isDurationValid("1h 30m")).toBe(true);
    expect(isDurationValid("1d 2h")).toBe(true);
    expect(isDurationValid("1w 2d")).toBe(true);
    expect(isDurationValid("1w 2d 3h 45m")).toBe(true);
    expect(isDurationValid("1w  2d  3h  45m")).toBe(true);
  });

  test("should validate formats with spaces at start/end", () => {
    expect(isDurationValid(" 1h30m ")).toBe(true);
    expect(isDurationValid("  1d2h  ")).toBe(true);
  });

  test("should validate formats with skipped parts", () => {
    expect(isDurationValid("1w45m")).toBe(true);
    expect(isDurationValid("2d45m")).toBe(true);
    expect(isDurationValid("1w3h")).toBe(true);
    expect(isDurationValid("1w 3h")).toBe(true);
  });

  test("should invalidate incorrect formats", () => {
    expect(isDurationValid("1x")).toBe(false);
    expect(isDurationValid("m30")).toBe(false);
    expect(isDurationValid("30")).toBe(false);
    expect(isDurationValid("1h30")).toBe(false);
    expect(isDurationValid("1hm")).toBe(false);
    expect(isDurationValid("h30m")).toBe(false);
    expect(isDurationValid("1h 30")).toBe(false);
    expect(isDurationValid("1h m")).toBe(false);
    expect(isDurationValid("1h2d")).toBe(false);
    expect(isDurationValid("1m2h")).toBe(false);
    expect(isDurationValid("m")).toBe(false);
  });
});

describe("stripHtmlTags", () => {
  test("should strip html tags", () => {
    expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
    expect(stripHtmlTags("<p>Hello<br>World</p>")).toBe("HelloWorld");
    expect(stripHtmlTags("<p>Hello<br>World</p><p>Hello<br>World</p>")).toBe("HelloWorldHelloWorld");
    expect(stripHtmlTags("<p>Hello<br>World</p><p>Hello<br>World</p><p>Hello<br>World</p>")).toBe(
      "HelloWorldHelloWorldHelloWorld",
    );
    expect(stripHtmlTags("<p>Hello<br>World</p><p>Hello<br>World</p><p>Hello<br>World</p><p>Hello<br>World</p>")).toBe(
      "HelloWorldHelloWorldHelloWorldHelloWorld",
    );
  });
});
