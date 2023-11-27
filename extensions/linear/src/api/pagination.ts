//
// Implements generic pagination for Linear's GraphQL API.
//
// For more information, see:
// https://developers.linear.app/docs/graphql/working-with-the-graphql-api/pagination
//

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string;
};

// Returns all results from a paginated query by iterating through all pages. Use with caution as
// it will not stop until all pages are retrieved!
export async function getPaginated<T, U>(
  getNextPage: (cursor?: string) => Promise<T>, // This function should make a GraphQL request to get one page after the given cursor.
  getPageInfo: (x: T) => PageInfo | undefined, // This function returns the PageInfo property from a requested page result.
  reducer: (accumulator: U, currentValue: T) => U, // This function works just like Array.prototype.reduce().
  initialValue: U, // The initial value provided to the reducer.
  pageLimit: number, // Prevent heap exhaustion by specifying the maximum number of pages we are allowed to retrieve.
): Promise<U> {
  let result = initialValue;

  let hasNextPage: boolean | undefined = true;
  let cursor: string | undefined = undefined;
  let pageCount = 0;

  while (hasNextPage && pageCount < pageLimit) {
    const data: T = await getNextPage(cursor);
    result = reducer(result, data);
    hasNextPage = getPageInfo(data)?.hasNextPage;
    cursor = getPageInfo(data)?.endCursor;
    pageCount++;
  }

  return result;
}
