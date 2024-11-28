import { isChat } from "../chats/types";
import { isCommand, isCommandRun, isStoreCommand } from "../commands/types";
import { isModel } from "../models/types";
import { ItemType } from "./enums";

/**
 * Gets the importable JSON string representation of an object.
 *
 * @param object The object to get the JSON representation of.
 * @returns The JSON string representation of the object.
 */
export function getObjectJSON(object: object): string {
  let objectKey = "item";
  if (isCommand(object) || isStoreCommand(object)) {
    objectKey = object.name;
  } else if (isChat(object)) {
    objectKey = `--chat-${object.name}`;
  } else if (isModel(object)) {
    objectKey = `--model-${object.name}`;
  }

  const objectWrapper = { [objectKey]: object };
  return JSON.stringify(objectWrapper).replaceAll(/\\([^"])/g, "\\\\$1");
}

/**
 * Gets the {@link ItemType} of an object.
 * @param object The object to get the item type of.
 * @returns The item type of the object.
 */
export function itemTypeForObject(object: object): ItemType {
  if (isCommand(object) || isStoreCommand(object)) {
    return ItemType.Command;
  } else if (isCommandRun(object)) {
    return ItemType.CommandRun;
  } else if (isChat(object)) {
    return ItemType.Chat;
  } else if (isModel(object)) {
    return ItemType.Model;
  }
  return ItemType.Item;
}
