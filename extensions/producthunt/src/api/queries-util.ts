// Extracts the GraphQL operation name for logging (e.g. "FeaturedPosts").
export function operationNameOf(query: string): string {
  const m = query.match(/\b(query|mutation)\s+(\w+)/);
  return m ? m[2] : "anonymous";
}
