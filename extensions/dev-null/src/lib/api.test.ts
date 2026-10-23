import { afterEach, describe, expect, it, vi } from "vitest";
import { getUser, getUserCommits, parseUsername, searchCommits, searchUsers, usernameFromCommitUrl } from "./api";

const log = () => undefined;

function answer(status: number, body: unknown) {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("parseUsername", () => {
  it("takes a bare name, an @name or a profile or commit URL", () => {
    expect(parseUsername(" nunomaduro ")).toBe("nunomaduro");
    expect(parseUsername("@nunomaduro")).toBe("nunomaduro");
    expect(parseUsername("https://dev-null.sh/@nunomaduro")).toBe("nunomaduro");
    expect(parseUsername("https://dev-null.sh/@slovenianGooner/commits/01a1")).toBe("slovenianGooner");
  });

  it("refuses anything that isn't a GitHub-style username", () => {
    expect(parseUsername("")).toBeUndefined();
    expect(parseUsername("two words")).toBeUndefined();
    expect(parseUsername("../me")).toBeUndefined();
  });
});

describe("usernameFromCommitUrl", () => {
  it("reads the author from a commit URL", () => {
    expect(usernameFromCommitUrl("https://dev-null.sh/@chrismessina/commits/01a164c4")).toBe("chrismessina");
    expect(usernameFromCommitUrl("https://example.com/@chrismessina/commits/01a164c4")).toBeUndefined();
    expect(usernameFromCommitUrl(undefined)).toBeUndefined();
  });
});

describe("getUser", () => {
  it("unwraps the profile", async () => {
    const fetchMock = answer(200, { data: { username: "nunomaduro", followers_count: 3 } });
    await expect(getUser("nunomaduro", log)).resolves.toMatchObject({ username: "nunomaduro", followers_count: 3 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://dev-null.sh/api/v1/users/nunomaduro");
  });

  it("says plainly when there is no such user", async () => {
    answer(404, { message: "No query results for model [App\\Models\\User] nobody" });
    await expect(getUser("nobody", log)).rejects.toThrow("No one on /dev/null is called @nobody.");
  });

  it("passes on the server's own message for other failures", async () => {
    answer(429, { message: "Too Many Attempts." });
    await expect(getUser("nunomaduro", log)).rejects.toThrow("Too Many Attempts.");
  });
});

describe("getUserCommits", () => {
  it("asks for the next page by cursor and reports whether there is another", async () => {
    const fetchMock = answer(200, { data: [{ id: "1" }], meta: { next_cursor: "abc" } });
    const page = await getUserCommits("nunomaduro", { cursor: "xyz", replies: true }, log);
    expect(fetchMock.mock.calls[0][0]).toBe("https://dev-null.sh/api/v1/users/nunomaduro/commits?cursor=xyz&replies=1");
    expect(page).toEqual({ data: [{ id: "1" }], hasMore: true, cursor: "abc" });
  });
});

describe("search", () => {
  it("gives search results the same links the API resources carry", async () => {
    answer(200, { users: [{ username: "nunomaduro", name: "Nuno" }] });
    await expect(searchUsers("nuno", log)).resolves.toEqual([
      { username: "nunomaduro", name: "Nuno", html_url: "https://dev-null.sh/@nunomaduro" },
    ]);

    const fetchMock = answer(200, { commits: [{ id: "01a1", body: "hi", user: { username: "lovro" } }] });
    const [commit] = await searchCommits("raycast app", log);
    expect(fetchMock.mock.calls[0][0]).toBe("https://dev-null.sh/search/commits?q=raycast+app");
    expect(commit).toMatchObject({
      id: "01a1",
      html_url: "https://dev-null.sh/@lovro/commits/01a1",
      author: { username: "lovro", html_url: "https://dev-null.sh/@lovro" },
    });
  });
});
