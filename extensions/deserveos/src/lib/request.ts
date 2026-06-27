import { isUnauthenticated, rawGql } from './client';
import { forceRefresh, getValidAccessToken } from './oauth';
import { getCoreEndpoint, getMetadataEndpoint } from './preferences';

// Authenticated GraphQL request with a single transparent refresh-and-retry on
// an UNAUTHENTICATED response (covers tokens revoked server-side between calls).
async function authedRequest<TData>(
  endpoint: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const token = await getValidAccessToken();

  try {
    return await rawGql<TData>(endpoint, query, variables, token);
  } catch (error) {
    if (isUnauthenticated(error)) {
      const refreshedToken = await forceRefresh();
      return rawGql<TData>(endpoint, query, variables, refreshedToken);
    }
    throw error;
  }
}

// auth + AI chat + custom DeserveOS resolvers
export const requestMetadata = <TData>(
  query: string,
  variables: Record<string, unknown> = {},
) => authedRequest<TData>(getMetadataEndpoint(), query, variables);

// dynamic workspace records (people, companies, opportunities, tasks)
export const requestCore = <TData>(
  query: string,
  variables: Record<string, unknown> = {},
) => authedRequest<TData>(getCoreEndpoint(), query, variables);
