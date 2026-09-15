import { describe, expect, it, vi } from "vitest";
import { addFoodItem, addNoteItem, toItemUpdatePayload, updateItem } from "./shopping";
import type { MealieClient } from "./client";
import type { IngredientFood, ShoppingListItem } from "../types";

function clientStub(overrides: Partial<MealieClient>): MealieClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    getAllPages: vi.fn(),
    ...overrides,
  } as unknown as MealieClient;
}

const existing: ShoppingListItem = {
  id: "item-1",
  shoppingListId: "list-1",
  checked: false,
  position: 7,
  quantity: 3,
  note: "aus dem Bioladen",
  display: "3 Äpfel",
  foodId: "food-1",
  food: null,
  labelId: "label-1",
  label: null,
  unitId: "unit-1",
  unit: null,
};

describe("toItemUpdatePayload", () => {
  it("keeps every field so Mealie's defaults cannot wipe them", () => {
    const payload = toItemUpdatePayload(existing, { checked: true });

    expect(payload).toEqual({
      shoppingListId: "list-1",
      checked: true,
      position: 7,
      quantity: 3,
      note: "aus dem Bioladen",
      foodId: "food-1",
      labelId: "label-1",
      unitId: "unit-1",
    });
  });

  it("does not send the nested food, unit or label objects back", () => {
    const payload = toItemUpdatePayload(existing, {});
    expect(payload).not.toHaveProperty("food");
    expect(payload).not.toHaveProperty("unit");
    expect(payload).not.toHaveProperty("label");
    expect(payload).not.toHaveProperty("display");
  });

  it("can clear the label explicitly without falling back to the old value", () => {
    expect(toItemUpdatePayload(existing, { labelId: null })).toMatchObject({ labelId: null });
  });

  it("keeps a quantity of zero instead of treating it as unset", () => {
    const zero = { ...existing, quantity: 0 };
    expect(toItemUpdatePayload(zero, {})).toMatchObject({ quantity: 0 });
  });
});

describe("updateItem", () => {
  it("PUTs to the single item endpoint", async () => {
    const put = vi.fn().mockResolvedValue({ ...existing, checked: true });
    await updateItem(clientStub({ put }), existing, { checked: true });
    expect(put).toHaveBeenCalledWith(
      "/api/households/shopping/items/item-1",
      expect.objectContaining({ checked: true }),
    );
  });
});

describe("addFoodItem", () => {
  it("carries the food's label so the item lands in the right aisle", async () => {
    const post = vi.fn().mockResolvedValue({ id: "new" });
    const food: IngredientFood = {
      id: "food-9",
      name: "Thymian",
      pluralName: null,
      labelId: "label-veg",
      label: { id: "label-veg", name: "Obst und Gemüse", color: "#81E36A" },
    };

    await addFoodItem(clientStub({ post }), "list-1", food);

    expect(post).toHaveBeenCalledWith("/api/households/shopping/items", {
      shoppingListId: "list-1",
      foodId: "food-9",
      labelId: "label-veg",
      // 0 statt 1: Mealie zeigt dann den blanken Namen ohne Mengenpraefix,
      // so wie die Items in der Referenzinstanz angelegt sind.
      quantity: 0,
      note: "",
      checked: false,
    });
  });

  it("sends a null label when the food has none", async () => {
    const post = vi.fn().mockResolvedValue({ id: "new" });
    const food: IngredientFood = { id: "f", name: "Käse", pluralName: null, labelId: null, label: null };

    await addFoodItem(clientStub({ post }), "list-1", food);

    expect(post).toHaveBeenCalledWith("/api/households/shopping/items", expect.objectContaining({ labelId: null }));
  });
});

describe("addNoteItem", () => {
  it("creates a free text item without a food reference", async () => {
    const post = vi.fn().mockResolvedValue({ id: "new" });
    await addNoteItem(clientStub({ post }), "list-1", "Cheddar", 2);

    expect(post).toHaveBeenCalledWith("/api/households/shopping/items", {
      shoppingListId: "list-1",
      foodId: null,
      labelId: null,
      quantity: 2,
      note: "Cheddar",
      checked: false,
    });
  });
});
