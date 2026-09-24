import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePromise } = vi.hoisted(() => ({ usePromise: vi.fn() }));
vi.mock("@raycast/utils", () => ({ usePromise }));

import type { IndexedNote } from "@type/notes";
import { useNoteMarkdown } from "@commands/search-notes/hooks/use-note-markdown";
import { showToast } from "../../../__mocks__/@raycast/api";

const note: IndexedNote = {
  id: "/work/Note.md",
  title: "Note",
  path: "Note.md",
  folder: { name: "", path: "", workspace: { name: "Work", path: "/work" } },
  pinned: false,
  searchText: "note note.md work",
};

beforeEach(() => {
  vi.clearAllMocks();
  usePromise.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
});

describe("useNoteMarkdown", () => {
  it("handles read failures inline without requesting the generic failure toast", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    useNoteMarkdown(note);

    const options = usePromise.mock.lastCall?.[2] as { onError?: (error: Error) => void };
    expect(options.onError).toEqual(expect.any(Function));
    options.onError?.(new Error("EACCES"));

    expect(log).toHaveBeenCalledWith("Failed to read note preview", expect.any(Error));
    expect(showToast).not.toHaveBeenCalled();
  });
});
