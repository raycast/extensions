import { expect, test } from "bun:test";
import { mockRaycastUi } from "./raycastUiMock";

mockRaycastUi();
const { swatchColor } = await import("../lib/cardIcons");

test("a palette's swatch skips colors that vanish on the list's background", () => {
  const paperAndInk = ["#F8F9FA", "#E9ECEF", "#ADB5BD", "#495057", "#212529"];
  expect(swatchColor(paperAndInk, "light")).toBe("#ADB5BD");
  expect(swatchColor(paperAndInk, "dark")).toBe("#F8F9FA");

  const oceanDeep = ["#03045E", "#0077B6", "#00B4D8"];
  expect(swatchColor(oceanDeep, "light")).toBe("#03045E");
  expect(swatchColor(oceanDeep, "dark")).toBe("#0077B6");

  expect(swatchColor(["#FFBE0B"], "light")).toBe("#FFBE0B");
  expect(swatchColor(["#FFF"], "light")).toBe("#FFF");
  expect(swatchColor([], "light")).toBeUndefined();
});
