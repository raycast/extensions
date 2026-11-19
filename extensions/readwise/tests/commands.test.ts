import { open } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";
import openDailyReview from "../src/dailyreview";
import openLibrary from "../src/library";

vi.mock("@raycast/api", () => ({ open: vi.fn() }));

const mockedOpen = vi.mocked(open);

describe.each([
  { name: "Daily Review", run: openDailyReview, url: "https://readwise.io/dailyreview" },
  { name: "Library", run: openLibrary, url: "https://readwise.io/everything" },
])("$name command", ({ run, url }) => {
  it("opens its Readwise page", async () => {
    mockedOpen.mockResolvedValueOnce(undefined);

    await run();

    expect(mockedOpen).toHaveBeenCalledExactlyOnceWith(url);
  });

  it("waits for the browser-opening operation to finish", async () => {
    let resolveOpen!: () => void;
    mockedOpen.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveOpen = resolve;
      })
    );
    let finished = false;
    const completion = run().then(() => {
      finished = true;
    });

    await Promise.resolve();
    expect(finished).toBe(false);

    resolveOpen();
    await completion;
    expect(finished).toBe(true);
  });

  it("propagates errors when the browser cannot open the page", async () => {
    const error = new Error("Unable to open browser");
    mockedOpen.mockRejectedValueOnce(error);

    await expect(run()).rejects.toBe(error);
  });
});
