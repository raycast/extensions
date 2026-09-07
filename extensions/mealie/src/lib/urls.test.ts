import { describe, expect, it } from "vitest";
import { recipeImageUrl, recipeWebUrl, shoppingListWebUrl } from "./urls";

const base = "https://mealie.example.org";

describe("recipeWebUrl", () => {
  it("builds the Mealie recipe page URL", () => {
    expect(recipeWebUrl(base, "home", "blech-pizza")).toBe("https://mealie.example.org/g/home/r/blech-pizza");
  });
});

describe("shoppingListWebUrl", () => {
  it("builds the shopping list URL", () => {
    expect(shoppingListWebUrl(base, "home", "abc")).toBe("https://mealie.example.org/g/home/shopping-lists/abc");
  });
});

describe("recipeImageUrl", () => {
  const recipe = { id: "00000000-0000-4000-8000-000000000001", image: "gUkp" };

  it("builds a media URL from an image token", () => {
    expect(recipeImageUrl(base, recipe)).toBe(
      "https://mealie.example.org/api/media/recipes/00000000-0000-4000-8000-000000000001/images/min-original.webp",
    );
  });

  it("returns undefined when there is no image", () => {
    expect(recipeImageUrl(base, { id: "x", image: null })).toBeUndefined();
  });

  it("treats Mealie's literal 'no image' placeholder as no image", () => {
    expect(recipeImageUrl(base, { id: "x", image: "no image" })).toBeUndefined();
  });

  it("treats an empty string as no image", () => {
    expect(recipeImageUrl(base, { id: "x", image: "   " })).toBeUndefined();
  });
});
