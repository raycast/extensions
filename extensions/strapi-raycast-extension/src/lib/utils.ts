import { Field, Entry } from "../types";

/**
 * Returns a human-readable name for the given kind.
 *
 * @param kind - The kind of type, either 'collectionType' or 'singleType'.
 * @returns 'Collection' if the kind is 'collectionType', otherwise 'Single'.
 */
export const kindName = (kind: "collectionType" | "singleType") => {
  return kind === "collectionType" ? "Collection" : "Single";
};

/**
 * Retrieves a title for the given entry based on common key names or falls back to 'id' or 'documentId'.
 *
 * @param entry - The entry object to extract the title from.
 * @returns The title of the entry based on common keys or 'id'/'documentId'.
 */
export const entryTtile = (entry: Entry) => {
  const commonKeys = ["title", "name", "subject", "key", "username", "email"];

  const key =
    commonKeys.find((key) => entry[key] !== undefined) ||
    Object.keys(entry).find((key) => !["id", "documentId", "createdAt", "updatedAt"].includes(key)) ||
    "id";

  return (entry[key] || entry.documentId).toString();
};

/**
 * Retrieves a subtitle for the given entry based on common key names.
 *
 * @param entry - The entry object to extract the subtitle from.
 * @returns The subtitle of the entry based on common keys or an empty string if none found.
 */
export const entrySubtitle = (entry: Entry) => {
  const commonKeys = [
    "description",
    "intro",
    "lead",
    "content",
    "summary",
    "message",
    "body",
    "text",
    "comment",
    "note",
  ];

  const key = commonKeys.find((key) => entry[key] !== undefined) || false;
  if (!key) return "";
  return entry[key].toString();
};

/**
 * Capitalize the first letter of every word in the given string.
 * @param string - The string to capitalize.
 * @returns The string with the first letter of every word capitalized.
 */
export const capitalize = (string: string) => {
  return string
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Generates a validation object for the given fields.
 * @param fields - The fields to generate the validation object for.
 * @returns A validation object for the given fields.
 */
export const generateValidation = (fields?: Field[]) => {
  if (!fields) return {};

  return Object.fromEntries(
    fields.map((field) => {
      return [
        field.name,
        (value: string) => {
          if (field.required && !value) return "This field is required.";

          switch (field.type) {
            case "integer":
              if (value && isNaN(+value)) return "This field must be a number.";
              if (value && field.min && +value < field.min) return `Must be greater than or equal to ${field.min}.`;
              if (value && field.max && +value > field.max) return `Must be less than or equal to ${field.max}.`;
              break;

            case "string":
              if (value && field.min && value.toString().length < field.min) return `Minimal ${field.min} characters.`;
              if (value && field.max && value.toString().length > field.max) return `Max ${field.max} characters.`;
              break;

            case "email":
              if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString())) return "Invalid email address.";
              break;
          }
        },
      ];
    }),
  ) as object;
};

/**
 * Generate payload object for the given values and fields.
 * @param values - The values to generate the payload object for.
 * @param fields - The fields to generate the payload object for.
 */
export const generatePayload = (values: { [key: string]: string }, fields: Field[]) => {
  return {
    data: {
      ...Object.fromEntries(
        fields.map((field) => {
          switch (field.type) {
            case "relation":
              return [field.name, { connect: values[field.name] }];

            case "dynamiczone":
              return [field.name, []];

            default:
              return [field.name, values[field.name]];
          }
        }),
      ),
    },
    status: "draft",
  };
};

/**
 * Attributes to array.
 */
export const attributesToFieldArray = (attributes: { [key: string]: object }) => {
  return Object.keys(attributes).map(
    (key: string) =>
      ({
        ...attributes[key],
        name: key,
      }) as Field,
  );
};
