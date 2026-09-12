import { describe, it, expect, vi, beforeEach } from "vitest";

const gqlMock = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ gql: gqlMock }));

import { createIdea } from "./ideas";

beforeEach(() => {
  gqlMock.mockReset();
});

describe("createIdea", () => {
  it("sends organizationId, title, and text in the content input", async () => {
    gqlMock.mockResolvedValue({
      createIdea: {
        id: "idea-1",
        organizationId: "org-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        content: { title: "My idea", text: "idea body" },
      },
    });

    await createIdea({
      organizationId: "org-1",
      title: "My idea",
      text: "idea body",
    });

    expect(gqlMock).toHaveBeenCalledTimes(1);
    const [, variables] = gqlMock.mock.calls[0];
    expect(variables).toEqual({
      input: {
        organizationId: "org-1",
        content: { title: "My idea", text: "idea body" },
      },
    });
  });

  it("returns the idea directly when the API returns an unwrapped Idea", async () => {
    const idea = {
      id: "idea-1",
      organizationId: "org-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      content: { text: "idea body" },
    };
    gqlMock.mockResolvedValue({ createIdea: idea });

    await expect(
      createIdea({ organizationId: "org-1", text: "idea body" }),
    ).resolves.toEqual(idea);
  });

  it("unwraps the idea from an IdeaResponse wrapper", async () => {
    const idea = {
      id: "idea-2",
      organizationId: "org-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      content: { text: "another idea" },
    };
    gqlMock.mockResolvedValue({
      createIdea: { idea, refreshIdeas: true },
    });

    await expect(
      createIdea({ organizationId: "org-1", text: "another idea" }),
    ).resolves.toEqual(idea);
  });

  it("throws on an InvalidInputError/LimitReachedError union response", async () => {
    gqlMock.mockResolvedValue({
      createIdea: { message: "Idea limit reached" },
    });

    await expect(
      createIdea({ organizationId: "org-1", text: "idea body" }),
    ).rejects.toThrow("Idea limit reached");
  });
});
