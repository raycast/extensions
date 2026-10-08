import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for a comma-separated list of decoded barcodes detected in selected images in Finder.
 */
const ImageBarcodesPlaceholder: Placeholder = {
  name: "imageBarcodes",
  regex: /{{imageBarcodes}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageBarcodes = context && "imageBarcodes" in context ? (context["imageBarcodes"] as string) : "";
    return { result: imageBarcodes, imageBarcodes: imageBarcodes };
  },
  result_keys: ["imageBarcodes"],
  constant: true,
  fn: async () => (await ImageBarcodesPlaceholder.apply("{{imageBarcodes}}")).result,
  example: "Identify the common theme among these barcode values: {{imageBarcodes}}",
  description: "Replaced with a comma-separated list of decoded barcodes detected in selected images in Finder.",
  hintRepresentation: "{{imageBarcodes}}",
  fullRepresentation: "Barcode Payloads in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageBarcodesPlaceholder;
