import { describe, expect, it } from "vitest";
import { suggestTitle, titleEdited, titleSuggested, type TitleState } from "./suggest-title";

const DESKTOP_APP = "/Applications/Linear.app";

describe("suggestTitle", () => {
  it("names a plain link after its brand", () => {
    expect(suggestTitle({ target: "https://www.youtube.com/feed/subscriptions" })).toBe("Youtube");
    expect(suggestTitle({ target: "https://www.youtube.com", brand: "YouTube" })).toBe("YouTube");
  });

  it("prefers the brand it is given over one derived from the domain", () => {
    expect(suggestTitle({ target: "https://acme.atlassian.net/jira", brand: "Jira" })).toBe("Jira");
  });

  it("reads a search target as a search", () => {
    expect(suggestTitle({ target: "https://www.youtube.com/results?search_query={query}", brand: "YouTube" })).toBe(
      "Search YouTube",
    );
  });

  it("opens a folder by its own name", () => {
    expect(suggestTitle({ target: "~/Downloads" })).toBe("Open Downloads");
    expect(suggestTitle({ target: "/Users/jane/Documents/Invoices/" })).toBe("Open Invoices");
  });

  it("names nothing for a bare home or root", () => {
    expect(suggestTitle({ target: "~" })).toBeUndefined();
    expect(suggestTitle({ target: "/" })).toBeUndefined();
  });

  it("opens a router, since it may land in the app rather than a browser", () => {
    expect(
      suggestTitle({
        target: "https://linear.app/acme/team/ENG/active",
        brand: "Linear",
        desktopApplication: DESKTOP_APP,
      }),
    ).toBe("Open Linear");
  });

  it("ignores a desktop app the generator would not build a router from", () => {
    expect(
      suggestTitle({ target: "https://linear.app/search?q={query}", brand: "Linear", desktopApplication: DESKTOP_APP }),
    ).toBe("Search Linear");
  });

  it("stays quiet when the target says too little", () => {
    expect(suggestTitle({ target: "" })).toBeUndefined();
    expect(suggestTitle({ target: "https://" })).toBeUndefined();
    expect(suggestTitle({ target: "obsidian://open?vault=notes" })).toBeUndefined();
  });
});

describe("title state", () => {
  const fresh: TitleState = { title: "", suggestion: "", touched: false };

  it("fills an untouched field", () => {
    expect(titleSuggested(fresh, "YouTube")).toEqual({ title: "YouTube", suggestion: "YouTube", touched: false });
  });

  it("replaces its own earlier suggestion", () => {
    const suggested = titleSuggested(fresh, "YouTube");
    expect(titleSuggested(suggested, "Search YouTube").title).toBe("Search YouTube");
  });

  it("does not count the echo of its own suggestion as an edit", () => {
    const suggested = titleSuggested(fresh, "YouTube");
    expect(titleEdited(suggested, "YouTube").touched).toBe(false);
  });

  it("never overwrites what the person typed", () => {
    const typed = titleEdited(titleSuggested(fresh, "YouTube"), "Watch Later");
    expect(typed.touched).toBe(true);
    expect(titleSuggested(typed, "Search YouTube").title).toBe("Watch Later");
  });

  it("stays frozen when the person types their way back to the suggestion", () => {
    const typed = titleEdited(titleEdited(titleSuggested(fresh, "YouTube"), "YouTub"), "YouTube");
    expect(typed.touched).toBe(true);
  });

  it("hands the field back once it is cleared", () => {
    const cleared = titleEdited(titleEdited(titleSuggested(fresh, "YouTube"), "Watch Later"), "");
    expect(cleared.touched).toBe(false);
    expect(titleSuggested(cleared, "Open Linear").title).toBe("Open Linear");
  });

  it("clears its own suggestion when the target stops naming anything", () => {
    expect(titleSuggested(titleSuggested(fresh, "YouTube"), undefined).title).toBe("");
  });
});
