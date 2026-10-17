/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { showToast, Toast } from "@raycast/api";
import { StatusForm } from "./status-form";
import { EMOJI, emojiSearchTerms } from "../lib/emoji";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function submit() {
  fireEvent.click(screen.getByTestId("submit"));
}

describe("StatusForm", () => {
  it("uses the submit title it was given", () => {
    render(<StatusForm submitTitle="Create Preset" onSubmit={vi.fn()} />);
    expect(screen.getByTestId("submit")).toHaveAttribute("data-title", "Create Preset");
  });

  it("submits the typed text", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<StatusForm submitTitle="Set Status" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("field-text"), { target: { value: "heads down" } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ emoji: "", text: "heads down" }));
  });

  it("submits the chosen emoji", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<StatusForm submitTitle="Set Status" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("field-emoji"), { target: { value: "\u{1F9E0}" } });
    fireEvent.change(screen.getByTestId("field-text"), { target: { value: "focus" } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ emoji: "\u{1F9E0}", text: "focus" }));
  });

  it("prefills from the initial values it was given", () => {
    render(
      <StatusForm submitTitle="Save Preset" initialEmoji={"\u{1F9E0}"} initialText="Focus time" onSubmit={vi.fn()} />,
    );
    expect(screen.getByTestId("field-text")).toHaveValue("Focus time");
    expect(screen.getByTestId("field-emoji")).toHaveValue("\u{1F9E0}");
  });

  it("refuses a submit with neither emoji nor text", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<StatusForm submitTitle="Set Status" onSubmit={onSubmit} />);
    submit();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ style: Toast.Style.Failure, title: "Add an emoji or some text" }),
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a whitespace-only text with no emoji", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<StatusForm submitTitle="Set Status" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("field-text"), { target: { value: "   " } });
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows an emoji with no text", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<StatusForm submitTitle="Set Status" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("field-emoji"), { target: { value: "\u{1F334}" } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ emoji: "\u{1F334}", text: "" }));
  });

  it("offers a none option plus one item per emoji", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    const options = screen.getByTestId("field-emoji").querySelectorAll("option");
    expect(options.length).toBe(EMOJI.length + 1);
    expect(options[0]).toHaveValue("");
  });

  it("wires each emoji's full search terms from emojiSearchTerms onto its dropdown item", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    const options = screen.getByTestId("field-emoji").querySelectorAll("option");
    // options[0] is the None item, with no keywords of its own; the rest map
    // 1:1 onto EMOJI in order. The item's `keywords` prop is not what performs
    // the filtering below (Raycast does not honour it); this only proves the
    // terms are wired through so they exist to be asserted on.
    EMOJI.forEach((entry, i) => {
      expect(options[i + 1]).toHaveAttribute("data-keywords", emojiSearchTerms(entry).join(" "));
    });
  });

  it("includes the shortcode's own name among an emoji's dropdown search terms", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    const brain = Array.from(screen.getByTestId("field-emoji").querySelectorAll("option")).find((o) =>
      o.textContent?.includes(":brain:"),
    );
    // Regression guard: this item's data-keywords must include "brain", the
    // shortcode's own name, because emojiSearchTerms is what our own
    // searchEmoji matches against (see the query-typing tests below). Raycast's
    // native filter does not honour this keywords prop at all, so this proves
    // only that the term is wired through, not that Raycast filters on it.
    expect(brain?.getAttribute("data-keywords")?.split(" ")).toContain("brain");
  });
  it("filters the dropdown as you type, by plain name", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "brain" } });
    const titles = Array.from(screen.getByTestId("field-emoji").querySelectorAll("option")).map((o) => o.textContent);
    expect(titles.some((t) => t?.includes(":brain:"))).toBe(true);
    expect(titles.length).toBeLessThan(EMOJI.length + 1);
  });

  it("filters by a curated keyword, which Raycast's own filtering never matched", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "lunch" } });
    const titles = Array.from(screen.getByTestId("field-emoji").querySelectorAll("option")).map((o) => o.textContent);
    expect(titles.some((t) => t?.includes(":fork_and_knife:"))).toBe(true);
  });

  it("always keeps the None option available while filtering", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "brain" } });
    expect(screen.getByTestId("field-emoji").querySelector("option")).toHaveValue("");
  });

  it("shows nothing but None when the query matches no emoji", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "zzzzqqqq" } });
    expect(screen.getByTestId("field-emoji").querySelectorAll("option")).toHaveLength(1);
  });

  it("keeps the chosen emoji rendered even when the query excludes it", () => {
    render(<StatusForm submitTitle="Set Status" onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("field-emoji"), { target: { value: "\u{1F41D}" } });
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "brain" } });
    // Without this the selection would silently vanish mid-search, blanking the
    // emoji when editing an existing preset.
    const values = Array.from(screen.getByTestId("field-emoji").querySelectorAll("option")).map((o) => o.value);
    expect(values).toContain("\u{1F41D}");
  });

  it("keeps a prefilled emoji rendered when the query excludes it", () => {
    render(<StatusForm submitTitle="Save Preset" initialEmoji={"\u{1F41D}"} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "brain" } });
    const values = Array.from(screen.getByTestId("field-emoji").querySelectorAll("option")).map((o) => o.value);
    expect(values).toContain("\u{1F41D}");
  });

  it("submits the pinned emoji even after a query that excludes it from the visible matches", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<StatusForm submitTitle="Save Preset" initialEmoji={"\u{1F41D}"} initialText="busy" onSubmit={onSubmit} />);
    // "brain" does not match the bee, so without the pin the dropdown's
    // rendered options would no longer include the selected value at all.
    fireEvent.change(screen.getByTestId("field-emoji-search"), { target: { value: "brain" } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ emoji: "\u{1F41D}", text: "busy" }));
  });
});
