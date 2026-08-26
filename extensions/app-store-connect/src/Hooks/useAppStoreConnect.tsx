import { useEffect, useMemo, useRef } from "react";
import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { boxPagedResult, unboxPagedResult } from "../Utils/pagedResult";
import { decodeBase64 } from "../Utils/base64";
import { SignJWT, importPKCS8 } from "jose";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

const API_BASE = "https://api.appstoreconnect.apple.com/v1";

/** Ceiling on pages fetched by `loadAll`, so an unattended loop always terminates. */
const MAX_AUTO_PAGES = 50;

export class ATCError extends Error {
  constructor(
    public title: string,
    public detail: string,
    /** HTTP status, so callers can tell "credentials rejected" from "request failed". */
    public status?: number,
  ) {
    super(title);
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ATCError);
    }
  }
}

interface AppStoreConnectApiResponse {
  data: unknown;
}

/**
 * The envelope App Store Connect wraps every collection response in. Native `fetch`
 * types `.json()` as `unknown` (node-fetch typed it `any`), so the envelope shape has
 * to be declared explicitly rather than inferred.
 */
interface AppStoreConnectEnvelope extends AppStoreConnectApiResponse {
  links?: { next?: string };
  meta?: { paging?: { limit: number } };
}

interface AppStoreConnectErrorEnvelope {
  errors?: { title: string; detail: string }[];
}

/**
 * A `Response` whose `json()` is narrowed to the caller's expected envelope. Native
 * `fetch` resolves `json()` to `unknown`, which would otherwise force an `unknown`
 * cast at all twelve call sites instead of one declaration here.
 */
type TypedResponse<T> = Omit<Response, "json"> & { json: () => Promise<T> };

/**
 * Reads a collection or single resource from App Store Connect.
 *
 * Pagination is cursor-based: App Store Connect returns the next page as an absolute
 * URL in `links.next`, which maps directly onto `useCachedPromise`'s cursor mode. That
 * mode owns page identity, so pages accumulate exactly once and reset when `path`
 * changes.
 *
 * `mapResponse` may return an array (a collection) or a single object (e.g. one user).
 * Cursor mode always accumulates arrays, so a non-array result is boxed for the trip
 * through the hook and unboxed on the way out.
 *
 * The box is a marker on the value itself rather than a flag held alongside it: cached
 * data is restored synchronously on first render, before the fetcher runs, so anything
 * derived inside the fetcher is not yet available when that data is first read.
 *
 * Pass `loadAll` to keep fetching until every page is in — for screens that need the
 * whole set to filter or count over, rather than a scroll-driven list.
 */
export function useAppStoreConnectApi<T>(
  path: string | undefined,
  mapResponse: (response: AppStoreConnectApiResponse) => T,
  loadAll?: boolean,
) {
  const {
    isLoading,
    data: pages,
    error,
    pagination,
    revalidate,
  } = useCachedPromise(
    (currentPath: string) => async (options: { cursor?: string }) => {
      const response = await fetchAppStoreConnect<AppStoreConnectEnvelope>(options.cursor ?? currentPath);
      const json = await response.json();
      const mapped = mapResponse(json);

      const next = json.links?.next;
      const cursor = next === undefined ? undefined : next.split(API_BASE)[1];

      // Only a collection may paginate. A boxed single result is unboxed solely when it
      // is the ONLY page, so following `links.next` on one would accumulate
      // `[box, ...items]` — a mixed array that unboxes to neither. This is reachable:
      // a mapper whose schema parse fails returns null while the envelope still carries
      // `links.next`.
      const isCollection = Array.isArray(mapped);

      return {
        data: boxPagedResult(mapped),
        hasMore: isCollection && cursor !== undefined,
        cursor: isCollection ? cursor : undefined,
      };
    },
    [path ?? ""],
    { execute: path !== undefined && path.length > 0 },
  );

  // Keep pulling pages when the caller wants the complete set.
  //
  // The path is tracked in a ref rather than compared in the effect body because the
  // reset must be SYNCHRONOUS with the path change. A separate `useEffect(..., [path])`
  // reset runs after this effect has already seen the new `path` alongside the PREVIOUS
  // path's `pagination` — whose `hasMore` is still true — and would fire `onLoadMore`
  // for the old cursor, appending a stale page to the new path's data.
  const autoLoadState = useRef({ path: "", pages: 0, truncated: false });
  const currentPath = path ?? "";
  if (autoLoadState.current.path !== currentPath) {
    autoLoadState.current = { path: currentPath, pages: 0, truncated: false };
  }

  useEffect(() => {
    if (!loadAll || isLoading || !pagination?.hasMore) {
      return;
    }
    // Only drive pagination that belongs to the path we are currently on.
    if (autoLoadState.current.path !== currentPath) {
      return;
    }
    // ponytail: hard page ceiling — this drives an unattended loop against a
    // rate-limited API, so a runaway must terminate even if `hasMore` is wrong.
    if (autoLoadState.current.pages >= MAX_AUTO_PAGES) {
      autoLoadState.current.truncated = true;
      return;
    }
    autoLoadState.current.pages += 1;
    pagination.onLoadMore();
  }, [loadAll, isLoading, pagination, currentPath]);

  const data = useMemo(() => unboxPagedResult<T>(pages), [pages]);

  return {
    isLoading,
    data,
    error,
    pagination,
    revalidate,
    /**
     * True when `loadAll` stopped at the page ceiling with more results outstanding —
     * the returned data is INCOMPLETE. Silently truncating looked identical to "that
     * is everything", so callers that count or filter over the whole set must say so.
     */
    isTruncated: autoLoadState.current.truncated,
  };
}

/**
 * Throws if the private key cannot be parsed. Call this BEFORE persisting a credential:
 * a key that fails here can never sign a request, but the failure carries no HTTP status,
 * so a rollback keyed on Apple's response would leave the unusable key stored — and a
 * complete stored key set makes the extension consider itself signed in.
 */
export async function assertPrivateKeyUsable(encodedPrivateKey: string) {
  await importPKCS8(decodeBase64(encodedPrivateKey), "ES256");
}

const getBearerToken = async () => {
  const alg = "ES256";
  const apiKey = await LocalStorage.getItem<string>("apiKey");
  const issuerId = await LocalStorage.getItem<string>("issuerID");
  const encoded = await LocalStorage.getItem<string>("privateKey");
  // issuerId is absent for an individual key, so it is not part of this guard.
  // Throws rather than returning undefined: a caller that skipped an undefined check
  // would carry on and report success for a request that was never sent.
  if (!apiKey || !encoded) {
    throw new ATCError("Missing API credentials", "Add an App Store Connect API key to continue.");
  }
  const privateKey = decodeBase64(encoded);

  const secret = await importPKCS8(privateKey, alg);
  const claims = new SignJWT({})
    .setProtectedHeader({ alg, kid: apiKey, typ: "JWT" })
    .setIssuedAt()
    .setAudience("appstoreconnect-v1")
    .setExpirationTime("20m");

  // Apple: "Individual keys don't use the Issuer ID key `iss`, but do require the
  // Subject key `sub`." The subject is always the literal "user" for individual keys.
  // https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
  const jwt = await (issuerId ? claims.setIssuer(issuerId) : claims.setSubject("user")).sign(secret);
  return jwt;
};

export const fetchAppStoreConnect = async <T = AppStoreConnectApiResponse,>(
  path: string,
  method: Method = "GET",
  body?: unknown,
): Promise<TypedResponse<T>> => {
  const bearerToken = await getBearerToken();
  const response = await fetch(API_BASE + path, {
    method: method,
    headers: {
      Authorization: "Bearer " + bearerToken,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const json = (await response.json()) as AppStoreConnectErrorEnvelope;
    const errors = json.errors;
    if (errors !== undefined && errors.length > 0) {
      throw new ATCError(errors[0].title, errors[0].detail, response.status);
    }
    throw new ATCError("Oh no!", "Something went wrong, error code: " + response.status, response.status);
  }
  return response as TypedResponse<T>;
};
