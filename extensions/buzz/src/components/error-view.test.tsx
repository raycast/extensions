/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { openExtensionPreferences } from "@raycast/api";
import { ErrorView } from "./error-view";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("ErrorView", () => {
  it("shows an Error's message as the description", () => {
    render(<ErrorView error={new Error("Cannot reach relay at https://relay.test")} />);
    expect(screen.getByTestId("empty-view")).toHaveAttribute(
      "data-description",
      "Cannot reach relay at https://relay.test",
    );
  });

  it("stringifies a thrown non-Error value", () => {
    render(<ErrorView error="plain string failure" />);
    expect(screen.getByTestId("empty-view")).toHaveAttribute("data-description", "plain string failure");
  });

  it("renders a stable title regardless of the error", () => {
    render(<ErrorView error={new Error("anything")} />);
    expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Something went wrong");
  });

  it("opens extension preferences from its action", () => {
    render(<ErrorView error={new Error("bad config")} />);
    fireEvent.click(screen.getByTestId("action"));
    expect(openExtensionPreferences).toHaveBeenCalledTimes(1);
  });
});
