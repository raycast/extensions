// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TranslationType } from "@/core/results/kinds";

import { decodeFavoriteSnapshot, decodeLegacyFavorites } from "./decode";
import FavoriteWordsPage from "./FavoriteWordsPage";
import { buildFavoriteWord, type FavoriteWord } from "./model";
import * as view from "./view";

const runtime = vi.hoisted(() => ({
  favorites: [] as FavoriteWord[],
  read: vi.fn(),
  tts: vi.fn(),
  copy: vi.fn(),
  launch: vi.fn(),
  close: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/consts", () => ({ networkTimeout: 3000, myPreferences: { flagsAreNotLanguages: true } }));
vi.mock("@/core/audio", () => ({ playQueryWordAudio: runtime.read, playTTS: runtime.tts }));
vi.mock("@/components/pages/StrokeOrderPage", () => ({
  default: ({ characters }: { characters: string[] }) => <div>{characters.join("")}</div>,
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("./useFavoriteWords", () => ({
  useFavoriteWords: () => ({
    favorites: runtime.favorites,
    state: { kind: "ready" },
    isLoading: false,
    remove: runtime.remove,
  }),
}));
vi.mock("@raycast/api", async () => {
  const { createElement: h, createContext, useContext, useState } = await import("react");
  const selection = createContext<(id: string) => void>(() => undefined);
  const group = ({ children }: { children?: ReactNode }) => h("div", null, children);
  const action = ({ title, onAction }: { title: string; onAction?: () => void }) =>
    h("button", { onClick: onAction }, title);
  const item = ({
    id,
    title,
    detail,
    actions,
  }: {
    id: string;
    title: string;
    detail: ReactNode;
    actions: ReactNode;
  }) => {
    const select = useContext(selection);
    return h("article", { "aria-label": title }, h("button", { onClick: () => select(id) }, title), detail, actions);
  };
  return {
    List: Object.assign(
      ({ children, onSelectionChange }: { children: ReactNode; onSelectionChange: (id: string) => void }) =>
        h(selection.Provider, { value: onSelectionChange }, children),
      {
        Section: group,
        EmptyView: group,
        Item: Object.assign(item, {
          Detail: ({ markdown }: { markdown?: string }) => h("div", { "data-testid": "detail" }, markdown),
        }),
      },
    ),
    Action: Object.assign(action, {
      Style: { Destructive: "destructive" },
      CopyToClipboard: ({ title, content }: { title: string; content: string }) =>
        h("button", { onClick: () => runtime.copy(content) }, title),
      Push: ({ title, target }: { title: string; target: ReactNode }) => {
        const [open, setOpen] = useState(false);
        return open ? target : h("button", { onClick: () => setOpen(true) }, title);
      },
    }),
    ActionPanel: Object.assign(group, { Section: group }),
    Icon: {},
    Keyboard: { Shortcut: { Common: { Refresh: {}, Remove: {} } } },
    Cache: class {},
    environment: { isDevelopment: false },
    LaunchType: { UserInitiated: "user" },
    launchCommand: runtime.launch,
    closeMainWindow: runtime.close,
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fresh(word: string, translation: string) {
  const query = {
    word,
    fromLanguage: "en",
    toLanguage: "zh-CHS",
    isWord: true,
    speechUrl: "https://example.com/audio",
  };
  return decodeFavoriteSnapshot(
    JSON.parse(
      JSON.stringify(
        buildFavoriteWord(query, [
          {
            type: TranslationType.Google,
            serviceId: "google",
            serviceLabel: "Google",
            serviceOrder: 0,
            content: { kind: "translation", query, paragraphs: [translation] },
          },
        ]),
      ),
    ),
  );
}

describe("favorite page content consumers", () => {
  it("renders only the selected snapshot and keeps copy, audio, stroke order and launch inputs after round-trip", async () => {
    runtime.favorites = [fresh("garden", "花园"), fresh("bird", "鸟")];
    const markdown = vi.spyOn(view, "favoriteMarkdown");
    render(<FavoriteWordsPage />);
    expect(markdown).toHaveBeenCalledTimes(1);
    const garden = within(screen.getByRole("article", { name: "garden" }));
    const bird = within(screen.getByRole("article", { name: "bird" }));
    expect(garden.getByTestId("detail").textContent).toContain("花园");
    expect(bird.getByTestId("detail").textContent).toBe("");
    fireEvent.click(garden.getByRole("button", { name: "Copy Translation" }));
    expect(runtime.copy).toHaveBeenLastCalledWith("花园");
    fireEvent.click(garden.getByRole("button", { name: "Copy All to Clipboard" }));
    expect(runtime.copy).toHaveBeenLastCalledWith("garden\t花园\nbird\t鸟");
    fireEvent.click(garden.getByRole("button", { name: "Read Word" }));
    expect(runtime.read).toHaveBeenLastCalledWith(runtime.favorites[0].query);
    fireEvent.click(garden.getByRole("button", { name: "Read Translation" }));
    expect(runtime.tts).toHaveBeenLastCalledWith("花园", "zh-CHS");
    fireEvent.click(garden.getByRole("button", { name: "Show Stroke Order" }));
    expect(garden.getByText("花园")).toBeTruthy();
    fireEvent.click(garden.getByRole("button", { name: "Open in Easydict" }));
    await waitFor(() =>
      expect(runtime.launch).toHaveBeenCalledWith({
        name: "easydict",
        type: "user",
        arguments: { queryText: "garden" },
      }),
    );
    fireEvent.click(bird.getByRole("button", { name: "bird" }));
    expect(markdown).toHaveBeenCalledTimes(2);
    expect(garden.getByTestId("detail").textContent).toBe("");
    expect(bird.getByTestId("detail").textContent).toContain("鸟");
    markdown.mockRestore();
  });

  it("keeps the copy and TTS preview of a migrated favorite that has no saved sections", () => {
    runtime.favorites = decodeLegacyFavorites([
      {
        word: "hello",
        fromLanguage: "en",
        toLanguage: "zh-CHS",
        translations: ["你好"],
        displaySections: [],
        createdAt: 1,
      },
    ]);
    render(<FavoriteWordsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Translation" }));
    expect(runtime.copy).toHaveBeenLastCalledWith("你好");
    fireEvent.click(screen.getByRole("button", { name: "Read Translation" }));
    expect(runtime.tts).toHaveBeenLastCalledWith("你好", "zh-CHS");
    fireEvent.click(screen.getByRole("button", { name: "Remove from Favorites" }));
    expect(runtime.remove).toHaveBeenLastCalledWith(runtime.favorites[0].query);
  });
});
