import type { QmdGetResult } from "../../types";

/**
 * Parse the output of `qmd get <path> --full`
 *
 * The output format is just the plain text content of the document.
 * We need to extract metadata from the path and create a structured result.
 */
export function parseGetDocument(output: string, query: string): QmdGetResult {
  const content = output.trim();

  // Check if query is a docid (starts with #)
  const isDocId = query.startsWith("#");

  if (isDocId) {
    // Query is a docid - we don't know the path
    const docid = query.slice(1); // Remove the # prefix
    return {
      path: "",
      docid,
      content,
      title: `Document ${query}`,
      collection: "",
    };
  }

  // Query is a path
  let collection = "";
  const path = query;

  if (query.startsWith("qmd://")) {
    const pathParts = query.slice(6).split("/");
    collection = pathParts[0] || "";
  }

  // Extract filename for title
  const pathSegments = query.split("/");
  const filename = pathSegments.at(-1) || query;
  const title = filename.replace(/\.md$/, "");

  return {
    path,
    docid: "",
    content,
    title,
    collection,
  };
}
