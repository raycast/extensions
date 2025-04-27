import { Tool } from "@raycast/api";
import { createObject, getSpace, getType } from "../api";
import { IconFormat } from "../models";

type Input = {
  /**
   * The unique identifier of the space to create the object in.
   * This value can be obtained from the `getSpaces` tool.
   */
  spaceId: string;

  /**
   * The key of the type of object to create.
   * This value can be obtained from the `getTypes` tool.
   */
  type_key: string;

  /**
   * The unique identifier of the object type to create.
   * This value can be obtained from the `getTypes` tool.
   */
  type_id: string;

  /**
   * The name of the object to create.
   * This value should be chosen based on the user's input.
   */
  name: string;

  /**
   * The icon of the object to create.
   * This value should be chosen based on the user's input.
   * If not given, choose the most suitable emoji.
   */
  icon: string;

  /**
   * The description of the object to create.
   * This value should be chosen based on the user's input.
   * If not given, set as an empty string.
   */
  description?: string;

  /**
   * The body of the object to create.
   * This value should be chosen based on the user's input and can include markdown syntax.
   * Collections and Sets can't have a body.
   */
  body?: string;

  /**
   * The URL of the bookmark, applicable when creating an object with type_key='ot-bookmark'.
   * This value should be chosen based on the user's input.
   * If not given, set as an empty string.
   */
  source?: string;
};

/**
 * Create a new object in the specified space.
 * This function creates an object with the specified details in the specified space.
 * The object is created with the specified name, icon, description, body.
 * When creating objects of type 'ot-bookmark', ensure the source URL is provided. The icon, name, and description should not be manually set, as they will be automatically populated upon fetching the URL.
 */
export default async function tool({ spaceId, type_key, name, icon, description, body, source }: Input) {
  const { object } = await createObject(spaceId, {
    name: name || "",
    icon: { format: IconFormat.Emoji, emoji: icon || "" },
    description: description || "",
    body: body || "",
    source: source || "",
    template_id: "", // not supported here
    type_key: type_key,
  });

  if (!object) {
    throw new Error("Failed to create object");
  }

  return {
    object: object.object,
    name: object.name,
    id: object.id,
    spaceId: object.space_id,
    type: {
      name: object.type.name,
      id: object.type.id,
      type_key: object.type.key,
    },
    snippet: object.snippet,
    properties: object.properties,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const s = await getSpace(input.spaceId);
  const t = await getType(input.spaceId, input.type_id);
  return {
    message: `Are you sure you want to create the following object?`,
    info: [
      {
        name: "Space",
        value: s.space?.name,
      },
      {
        name: "Type",
        value: t.type?.name || "",
      },
      {
        name: "Name",
        value: input.name,
      },
      ...(input.icon !== undefined ? [{ name: "Icon", value: input.icon }] : []),
      ...(input.description !== undefined ? [{ name: "Description", value: input.description }] : []),
      ...(input.body !== undefined ? [{ name: "Body", value: input.body }] : []),
      ...(input.source !== undefined ? [{ name: "URL", value: input.source }] : []),
    ],
  };
};
