/**
 * Encode an object or array of parameters into a query string.
 */
export function encodeQueryParams(params: Record<string, number | string | string[]>): string {
  const queryParams: string[] = [];

  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== "") {
      if (Array.isArray(value)) {
        // Encode array values as multiple query parameters with the same key
        value.forEach((item) => {
          if (item !== "") {
            queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
          }
        });
      } else {
        // Encode single values as a single query parameter
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
  }

  return queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
}
