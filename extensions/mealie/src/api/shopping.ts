import type { MealieClient, PaginatedResponse } from "./client";
import type { IngredientFood, ShoppingList, ShoppingListDetail, ShoppingListItem } from "../types";

const LISTS = "/api/households/shopping/lists";
const ITEMS = "/api/households/shopping/items";

/**
 * Mealie zeigt bei quantity 0 den blanken Namen ohne Mengenpraefix. Die Items
 * der Referenzinstanz sind so angelegt, deshalb ist das der Default beim
 * schnellen Hinzufuegen. Eine Menge laesst sich danach im Item-Formular setzen.
 */
const DEFAULT_QUANTITY = 0;

export async function getShoppingLists(client: MealieClient): Promise<ShoppingList[]> {
  const response = await client.get<PaginatedResponse<ShoppingList>>(LISTS, { page: 1, perPage: 100 });
  return response?.items ?? [];
}

/** Liefert Items und labelSettings in einem Request. Der Items-Endpunkt kann nicht nach Liste filtern. */
export function getShoppingList(client: MealieClient, listId: string): Promise<ShoppingListDetail> {
  return client.get<ShoppingListDetail>(LISTS + "/" + listId);
}

export function createShoppingList(client: MealieClient, name: string): Promise<ShoppingList> {
  return client.post<ShoppingList>(LISTS, { name: name.trim() });
}

export function renameShoppingList(client: MealieClient, list: ShoppingList, name: string): Promise<ShoppingList> {
  return client.put<ShoppingList>(LISTS + "/" + list.id, { name: name.trim() });
}

export function deleteShoppingList(client: MealieClient, listId: string): Promise<void> {
  return client.del(LISTS + "/" + listId);
}

export function addFoodItem(
  client: MealieClient,
  listId: string,
  food: IngredientFood,
  quantity = DEFAULT_QUANTITY,
): Promise<ShoppingListItem> {
  return client.post<ShoppingListItem>(ITEMS, {
    shoppingListId: listId,
    foodId: food.id,
    // Explizit mitgeben. Ob Mealie das Label serverseitig aus dem Food ableitet,
    // ist nicht verifiziert; so ist es in beiden Faellen korrekt.
    labelId: food.labelId,
    quantity,
    note: "",
    checked: false,
  });
}

export function addNoteItem(
  client: MealieClient,
  listId: string,
  note: string,
  quantity = DEFAULT_QUANTITY,
): Promise<ShoppingListItem> {
  return client.post<ShoppingListItem>(ITEMS, {
    shoppingListId: listId,
    foodId: null,
    labelId: null,
    quantity,
    note: note.trim(),
    checked: false,
  });
}

export interface ItemChanges {
  checked?: boolean;
  quantity?: number;
  note?: string;
  labelId?: string | null;
  unitId?: string | null;
  position?: number;
}

/**
 * ShoppingListItemUpdate hat Defaults auf allen Feldern (quantity=1, note="",
 * checked=false, position=0). Ein Teilobjekt wuerde vorhandene Werte
 * ueberschreiben, deshalb wird immer das vollstaendige Item gesendet.
 * Die verschachtelten food/unit/label-Objekte gehoeren nicht in den Payload.
 */
export function toItemUpdatePayload(item: ShoppingListItem, changes: ItemChanges): Record<string, unknown> {
  return {
    shoppingListId: item.shoppingListId,
    checked: changes.checked ?? item.checked,
    position: changes.position ?? item.position,
    quantity: changes.quantity ?? item.quantity,
    note: changes.note ?? item.note ?? "",
    foodId: item.foodId,
    labelId: changes.labelId !== undefined ? changes.labelId : item.labelId,
    unitId: changes.unitId !== undefined ? changes.unitId : item.unitId,
  };
}

export function updateItem(
  client: MealieClient,
  item: ShoppingListItem,
  changes: ItemChanges,
): Promise<ShoppingListItem> {
  return client.put<ShoppingListItem>(ITEMS + "/" + item.id, toItemUpdatePayload(item, changes));
}

export function deleteItem(client: MealieClient, itemId: string): Promise<void> {
  return client.del(ITEMS + "/" + itemId);
}

export async function addRecipeToList(client: MealieClient, listId: string, recipeId: string): Promise<void> {
  await client.post(LISTS + "/" + listId + "/recipe/" + recipeId, {});
}
