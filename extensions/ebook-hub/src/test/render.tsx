import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cleanup, configure, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach } from "vitest";

import type { NewBook } from "../domain/book";
import { LibraryStore } from "../storage/library-store";
import { NavigationRoot, environment, resetRaycastMock } from "./raycast-api";

// Views write real files while the whole suite runs in parallel, so the default one second
// `waitFor` budget is too tight.
configure({ asyncUtilTimeout: 5000 });

const tempDirs: string[] = [];

afterEach(async () => {
  cleanup();
  resetRaycastMock();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

export function renderCommand(element: ReactNode) {
  return render(<NavigationRoot>{element}</NavigationRoot>);
}

/** The top-most pushed view, as Raycast would show it. */
export function currentView(): HTMLElement {
  const views = screen.getAllByTestId("view");
  return views[views.length - 1];
}

export function view() {
  return within(currentView());
}

export function viewDepth(): number {
  return screen.getAllByTestId("view").length;
}

/** Point `environment.supportPath` at a fresh temp folder and return the matching store. */
export async function useTempLibrary(): Promise<LibraryStore> {
  const dir = await mkdtemp(join(tmpdir(), "ebook-hub-view-"));
  tempDirs.push(dir);
  environment.supportPath = dir;
  return new LibraryStore(join(dir, "library"));
}

export function sampleBook(overrides: Partial<NewBook> = {}): NewBook {
  return {
    title: "Walden",
    authors: ["Henry David Thoreau"],
    language: "en",
    categories: ["essays"],
    license: "public-domain",
    visibility: "private",
    source: { kind: "import", format: "md", fileName: "walden.md" },
    chapters: [
      { title: "Economy", markdown: "When I wrote the following pages." },
      { title: "Solitude", markdown: "This is a delicious evening." },
    ],
    ...overrides,
  };
}
