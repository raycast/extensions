// Low-level GraphQL transport. No auth/refresh logic lives here so that auth.ts
// can depend on it without creating an import cycle.

export class GqlError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GqlError';
    this.code = code;
  }
}

export const isUnauthenticated = (error: unknown): boolean =>
  error instanceof GqlError &&
  (error.code === 'UNAUTHENTICATED' ||
    error.code === 'UNAUTHENTICATED_ERROR' ||
    /unauthenticated|unauthorized|invalid token|jwt expired|expired token/i.test(
      error.message,
    ));

type GqlResponse<TData> = {
  data?: TData;
  errors?: { message: string; extensions?: { code?: string } }[];
};

export async function rawGql<TData>(
  endpoint: string,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<TData> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (networkError) {
    throw new GqlError(
      `Could not reach your DeserveOS workspace. Check the Workspace URL in the extension preferences.\n${
        networkError instanceof Error ? networkError.message : ''
      }`.trim(),
    );
  }

  let json: GqlResponse<TData>;
  try {
    json = (await response.json()) as GqlResponse<TData>;
  } catch {
    throw new GqlError(
      `Unexpected response (HTTP ${response.status}) from the server.`,
    );
  }

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const first = json.errors[0];
    throw new GqlError(
      first.message ?? 'GraphQL error',
      first.extensions?.code,
    );
  }

  if (!response.ok) {
    throw new GqlError(`Request failed with HTTP ${response.status}.`);
  }

  if (json.data === undefined || json.data === null) {
    throw new GqlError('The server returned an empty response.');
  }

  return json.data;
}
