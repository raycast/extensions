// @vitest-environment happy-dom
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { open, toasts } from "../test/raycast-api";
import { renderCommand, view } from "../test/render";
import { HUE_MOODS } from "../theme/hue-tokens";
import { ApplyHueThemeSubmenu, applyHueTheme } from "./ThemeActions";

describe("ApplyHueThemeSubmenu", () => {
  it("opens the Raycast theme import for the chosen mood", async () => {
    renderCommand(<ApplyHueThemeSubmenu />);

    fireEvent.click(view().getByRole("button", { name: "Huế Hương" }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0][0]).toMatch(/^raycast:\/\/theme\?/);
    expect(open.mock.calls[0][0]).toContain(`name=${encodeURIComponent("Huế Hương")}`);
  });

  it("shows a failure toast when Raycast cannot open the import", async () => {
    open.mockRejectedValueOnce(new Error("blocked"));

    await applyHueTheme(HUE_MOODS.cung);

    expect(toasts).toEqual([{ style: "failure", title: "Could not open theme import", message: "blocked" }]);
  });
});
