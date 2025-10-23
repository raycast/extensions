// src/utils.ts
import { NewRequest, Headers, Collection, newRequestSchema } from "~/types";
import { prepareRequest, resolveVariables } from ".";

/**
 * Parses a cURL command string and converts it into a NewRequest object.
 * This is a simplified parser designed to handle common cURL commands,
 * such as those copied from browser developer tools.
 * @param curl The raw cURL command string to parse.
 * @returns A NewRequest object, or null if parsing fails.
 */
export function parseCurlToRequest(curl: string): NewRequest | null {
  try {
    // The URL is typically the last argument that doesn't start with a hyphen.
    // This regex finds all quoted strings or standalone words.
    const urlMatch = curl.match(/'(https?:\/\/[^']+|[^']+)'|"(https?:\/\/[^"]+|[^"]+)"|(\S+)/g);
    const url = urlMatch?.find((u) => u.includes("http") || u.startsWith("'http"))?.replace(/['"]/g, "") ?? "";

    // Find the method flag (-X or --request) and capture the next word.
    const methodMatch = curl.match(/-X\s*(\w+)|--request\s*(\w+)/);
    const method = (methodMatch ? methodMatch[1] || methodMatch[2] : "GET").toUpperCase();

    // Find all header flags (-H or --header) and their values. The 'g' flag finds all occurrences.
    const headers: Headers = [];
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(curl)) !== null) {
      const headerString = headerMatch[1] || headerMatch[2];
      const [key, ...valueParts] = headerString.split(": ");
      if (key) {
        headers.push({ key, value: valueParts.join(": ") });
      }
    }

    // Find the data payload, looking for --data or --data-raw.
    const bodyMatch = curl.match(/--data-raw\s*'([^']*)'|--data\s*'([^']*)'/);
    const body = bodyMatch ? bodyMatch[1] || bodyMatch[2] : undefined;
    const bodyType: "JSON" | "NONE" = body ? "JSON" : "NONE";

    // Separate the URL from its query parameters.
    let requestUrl = url;
    let params: string | undefined = undefined;
    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex + 1);
      requestUrl = url.substring(0, queryIndex);

      // Use the built-in URLSearchParams to correctly parse the query.
      const searchParams = new URLSearchParams(queryString);
      params = JSON.stringify(Object.fromEntries(searchParams.entries()));
    }

    // Assemble the raw parsed data
    const rawParsedData = {
      url: requestUrl,
      method: method,
      headers,
      body,
      bodyType,
      params: method === "GET" ? params : undefined,
    };

    // ✅ Validate the entire request against the Zod schema
    // This will catch any invalid data and provide clear error messages
    const newRequest = newRequestSchema.parse(rawParsedData);

    return newRequest;
  } catch (error) {
    console.error("Failed to parse cURL command:", error);
    return null;
  }
}

/**
 * Converts a request object into a cURL command string.
 */
export function generateCurlCommand(
  request: NewRequest,
  collection: Collection,
): { command: string; hasTempVars: boolean } {
  const variables = resolveVariables();
  const { finalUrl, finalHeaders, finalBody, finalParams, finalGqlQuery, finalGqlVariables } = prepareRequest(
    request,
    collection,
    variables,
  );

  let commandUrl = finalUrl;

  // If there are params (for a GET request), convert them to a query string
  if (finalParams) {
    try {
      const paramsObject = JSON.parse(finalParams);
      const queryString = new URLSearchParams(paramsObject).toString();
      if (queryString) {
        commandUrl += `?${queryString}`;
      }
    } catch {
      // Silently ignore invalid JSON in params for cURL generation
    }
  }

  // The method for the cURL command should be POST for GraphQL
  const curlMethod = request.method === "GRAPHQL" ? "POST" : request.method;

  // ENSURE CONTENT-TYPE IS SET FOR GRAPHQL ---
  if (request.method === "GRAPHQL") {
    // Check if a content-type header already exists (case-insensitive)
    const hasContentType = Object.keys(finalHeaders).some((k) => k.toLowerCase() === "content-type");
    if (!hasContentType) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  // Start building the command with the potentially updated URL
  let curl = `curl --location --request ${curlMethod} '${commandUrl}'`; // Add headers
  for (const [key, value] of Object.entries(finalHeaders)) {
    curl += ` \\\n  --header '${key}: ${value}'`;
  }

  // Add body
  // Conditionally handle the body based on its type
  if (request.method === "GRAPHQL") {
    try {
      const gqlPayload = {
        query: finalGqlQuery,
        variables: finalGqlVariables ? JSON.parse(finalGqlVariables) : undefined,
      };
      // Escape single quotes in the final JSON string
      const gqlBody = JSON.stringify(gqlPayload).replace(/'/g, "'\\''");
      curl += ` \\\n  --data-raw '${gqlBody}'`;
    } catch {
      /* ignore invalid JSON */
    }
  } else if (request.bodyType === "FORM_DATA" && finalBody) {
    try {
      const pairs: { key: string; value: string }[] = JSON.parse(finalBody);
      for (const pair of pairs) {
        // Use the -F flag for each form data field
        curl += ` \\\n  -F '${pair.key}=${pair.value}'`;
      }
    } catch {
      // Ignore if the body is not a valid JSON array of pairs
    }
  } else if (finalBody) {
    // The existing logic for raw/JSON bodies
    curl += ` \\\n  --data-raw '${finalBody}'`;
  }
  const hasTempVars = /\{\{[^}]+\}\}/.test(curl);

  return { command: curl, hasTempVars };
}
