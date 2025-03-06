import { getTagsToAdd, prepareFavorites } from "./utils";
import { IssueTag } from "youtrack-rest-client";

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
      },
      {
        ...tagTemplate,
        name: "ideas",
        id: "7-1",
      },
      {
        ...tagTemplate,
        name: "myTag",
        id: "7-3",
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
