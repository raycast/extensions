import { AUTH_HEADER, DEFAULT_BASE_URL, ReeplOperation } from './operations';

export type JsonObject = Record<string, unknown>;

export type OperationResult = {
  status: number;
  ok: boolean;
  operation: string;
  method: ReeplOperation['method'];
  path: string;
  url: string;
  data: unknown;
};

export class ReeplApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly result: OperationResult;

  constructor(result: OperationResult) {
    const detail = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    super(`Request failed (${result.status})${detail ? `: ${detail}` : ''}`);
    this.name = 'ReeplApiError';
    this.status = result.status;
    this.data = result.data;
    this.result = result;
  }
}

export function parseJsonObject(input: string, label: string): JsonObject {
  if (!input || input.trim() === '') {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }

  return parsed as JsonObject;
}

export function interpolatePath(pathTemplate: string, pathParams: JsonObject): string {
  return pathTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = pathParams[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required path param: ${key}`);
    }

    return encodeURIComponent(String(value));
  });
}

function queryValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function createRequestUrl(
  baseUrl: string,
  operation: ReeplOperation,
  pathParams: JsonObject,
  query: JsonObject,
): URL {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  if (!normalizedBaseUrl) {
    throw new Error('Base URL is not configured');
  }

  let url: URL;
  try {
    url = new URL(`${normalizedBaseUrl}${interpolatePath(operation.path, pathParams)}`);
  } catch {
    throw new Error('Base URL must be a valid HTTPS URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Base URL must use HTTPS');
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value) === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, queryValue(item)));
      return;
    }

    url.searchParams.set(key, queryValue(value));
  });

  return url;
}

function parseResponse(text: string): unknown {
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function executeOperation({
  operation,
  apiKey,
  pathParams = {},
  query = {},
  body = {},
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
}: {
  operation: ReeplOperation;
  apiKey: string;
  pathParams?: JsonObject;
  query?: JsonObject;
  body?: JsonObject;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<OperationResult> {
  if (!apiKey.trim()) {
    throw new Error('Add your Reepl API key in the extension preferences first');
  }

  const interpolatedPath = interpolatePath(operation.path, pathParams);
  const url = createRequestUrl(baseUrl, operation, pathParams, query);
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(operation.method);
  const response = await fetchImpl(url.toString(), {
    method: operation.method,
    headers: {
      [AUTH_HEADER]: apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const result: OperationResult = {
    status: response.status,
    ok: response.ok,
    operation: operation.id,
    method: operation.method,
    path: interpolatedPath,
    url: url.toString(),
    data: parseResponse(await response.text()),
  };

  if (!result.ok) {
    throw new ReeplApiError(result);
  }

  return result;
}
