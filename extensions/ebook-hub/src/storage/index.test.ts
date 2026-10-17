import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { LocalStorage, environment, resetRaycastMock } from "../test/raycast-api";
import { forgetLastOpened, getLibraryStore, readLastOpened, rememberLastOpened } from ".";

const BOOK_ID = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

afterEach(resetRaycastMock);

describe("getLibraryStore", () => {
  it("stores books under the extension support path", () => {
    environment.supportPath = "/support";
    expect(getLibraryStore().bookPath(BOOK_ID)).toBe(join("/support", "library", BOOK_ID));
  });
});

describe("last opened book", () => {
  it("remembers, reads, and forgets only the matching book", async () => {
    expect(await readLastOpened()).toBeNull();

    await rememberLastOpened(BOOK_ID);
    expect(await readLastOpened()).toBe(BOOK_ID);

    await forgetLastOpened("another-book");
    expect(await readLastOpened()).toBe(BOOK_ID);

    await forgetLastOpened(BOOK_ID);
    expect(await readLastOpened()).toBeNull();
    expect(LocalStorage.removeItem).toHaveBeenCalledTimes(1);
  });
});
