import { LocalStorage } from "@raycast/api";
import { Model } from "./types";

/**
 * Updates a model's data.
 * @param model The model to update.
 * @param newData The new data to update the model with.
 * @returns A promise that resolves when the model is updated.
 */
export async function updateModel(model: Model, newData: Model) {
  if (model.name !== newData.name) {
    await LocalStorage.removeItem(`--model-${model.name}`);
  }
  await LocalStorage.setItem(`--model-${newData.name}`, JSON.stringify(newData));
}

/**
 * Function to delete a model.
 * @param model The model to delete.
 * @returns A promise that resolves when the model is deleted.
 */
export async function deleteModel(model: Model) {
  await LocalStorage.removeItem(`--model-${model.name}`);
}
