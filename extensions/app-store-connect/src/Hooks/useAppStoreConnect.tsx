import { useEffect, useMemo, useRef, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { credentialCacheKey } from "../Utils/credentials";
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
 * The credential the cache belongs to, tagged with the path it was resolved for.
 *
 * `useCachedPromise` keys its cache on the dependency list, and an API path is the same
 * string for every team — so after switching teams a command restored the PREVIOUS
 * team's rows from cache, and if the new request then failed those rows stayed on
 * screen as if they belonged to the new team. Making the selected credential part of
 * the key gives each account its own bucket, and a cache entry can never be served
 * across accounts.
 *
 * Re-read whenever `path` changes, NOT once per mount. This hook is called from the
 * command body, above the <SignIn> gate, so on a first run it mounts before any
 * credential exists and resolves to "". A caller sets its path from `didSignIn`, so a
 * path arriving is precisely the moment a credential became available — reading once
 * would leave the scope empty forever and the command would never issue a request at
 * all, showing an empty list until it was relaunched.
 *
 * The result carries `forPath` because `isLoading` alone goes stale for one render:
 * `usePromise` keeps reporting the previous scope, with `isLoading` still false, until
 * its own effect runs. Comparing the tag makes a path change disable the request in the
 * SAME render, closing the window where a new path could pair with the old account's
 * cache key.
 */
function useCredentialScope(path: string | undefined) {
  const currentPath = path ?? "";
  const { data, isLoading, error } = usePromise(
    async (forPath: string) => {
      const credential = await readCredential();
      return { forPath, scope: credentialCacheKey(credential?.apiKey, credential?.issuerID) };
    },
    [currentPath],
  );

  const isCurrent = data?.forPath === currentPath;
  return {
    scope: isCurrent ? data.scope : undefined,
    // A scope resolved for a different path is not "loaded" — it is the previous one.
    // A FAILED read, though, is resolved and unusable: nothing re-triggers it, so
    // reporting it as still loading would hang the command on a spinner forever.
    // `isLoading` is checked FIRST because a retry after a failure still carries the
    // previous error; testing the error first would call that retry "not loading" and
    // flash an empty list in the middle of it.
    isLoadingScope: isLoading || (error === undefined && !isCurrent),
    scopeError: error,
  };
}

/** The selected credential, read as one snapshot. */
interface Credential {
  apiKey: string;
  issuerID?: string;
  privateKey: string;
}

/**
 * Reads the selected credential in one pass.
 *
 * One snapshot, not three reads at three moments: the cache identity a response is
 * stored under and the key that signs the request must come from the SAME read, or the
 * selection can change between them and a response authenticated as one account gets
 * written into another account's cache bucket.
 *
 * Returns undefined when no usable credential is stored; `issuerID` is absent for an
 * individual key, which is what selects the individual-key signing path.
 */
async function readCredential(): Promise<Credential | undefined> {
  const apiKey = await LocalStorage.getItem<string>("apiKey");
  const issuerID = await LocalStorage.getItem<string>("issuerID");
  const privateKey = await LocalStorage.getItem<string>("privateKey");
  if (!apiKey || !privateKey) {
    return undefined;
  }
  return { apiKey, issuerID: issuerID && issuerID.length > 0 ? issuerID : undefined, privateKey };
}

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
  const { scope, isLoadingScope, scopeError } = useCredentialScope(path);
  // Three conditions, each closing a different hole:
  //   - a path to request,
  //   - a credential to request it with — an empty scope is never a valid cache key, so
  //     nothing can be restored under it either,
  //   - and that credential RESOLVED for this path. While the scope is revalidating,
  //     `usePromise` still reports the previous value, and fetching against it would
  //     write the new path's rows into the old credential's cache bucket.
  const shouldExecute =
    path !== undefined && path.length > 0 && scope !== undefined && scope.length > 0 && !isLoadingScope;

  const {
    isLoading,
    data: pages,
    error,
    pagination,
    revalidate,
  } = useCachedPromise(
    (currentPath: string, credentialScope: string) => async (options: { cursor?: string }) => {
      // The cache key was fixed a render ago, so confirm the selection still matches it
      // before storing anything under it. This ONE snapshot then signs the request too:
      // checking with one read and signing with another leaves a window in between, and
      // a switch landing in that window would authenticate as the new account and file
      // the response under the old one's cache key — the cross-team leak this scoping
      // exists to prevent. Same read, no window.
      const credential = await readCredential();
      if (credentialCacheKey(credential?.apiKey, credential?.issuerID) !== credentialScope) {
        throw new ATCError("Selected team changed", "Reopen this command to load data for the team you selected.");
      }
      const response = await fetchAppStoreConnect<AppStoreConnectEnvelope>(
        options.cursor ?? currentPath,
        "GET",
        undefined,
        credential,
      );
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
    // The credential is part of the cache key, not just the request.
    [path ?? "", scope ?? ""],
    { execute: shouldExecute },
  );

  // Keep pulling pages when the caller wants the complete set.
  //
  // The path is tracked in a ref rather than compared in the effect body because the
  // reset must be SYNCHRONOUS with the path change. A separate `useEffect(..., [path])`
  // reset runs after this effect has already seen the new `path` alongside the PREVIOUS
  // path's `pagination` — whose `hasMore` is still true — and would fire `onLoadMore`
  // for the old cursor, appending a stale page to the new path's data.
  //
  // Truncation is STATE, not part of that ref: it is read by the caller to render a
  // warning, and mutating a ref schedules no render — the flag was set after the last
  // render had already read `false`, so the warning never appeared.
  const [isTruncated, setIsTruncated] = useState(false);
  const autoLoadState = useRef({ key: "", pages: 0 });
  // Scoped by credential as well as path: switching either starts a different result set.
  const currentKey = `${scope ?? ""}|${path ?? ""}`;
  if (autoLoadState.current.key !== currentKey) {
    autoLoadState.current = { key: currentKey, pages: 0 };
    // Reset during render, for the same reason the ref is: an effect-based reset would
    // run after the load effect had already read the previous key's truncation.
    setIsTruncated(false);
  }

  useEffect(() => {
    if (!loadAll || isLoading || !pagination?.hasMore) {
      return;
    }
    // Only drive pagination that belongs to the result set we are currently on.
    if (autoLoadState.current.key !== currentKey) {
      return;
    }
    // ponytail: hard page ceiling — this drives an unattended loop against a
    // rate-limited API, so a runaway must terminate even if `hasMore` is wrong.
    if (autoLoadState.current.pages >= MAX_AUTO_PAGES) {
      setIsTruncated(true);
      return;
    }
    autoLoadState.current.pages += 1;
    pagination.onLoadMore();
  }, [loadAll, isLoading, pagination, currentKey]);

  const data = useMemo(() => unboxPagedResult<T>(pages), [pages]);

  return {
    // Resolving the credential is part of loading: without it a list would render its
    // "nothing here" empty view for a moment before the first request had been made.
    isLoading: isLoading || isLoadingScope,
    data,
    // A credential that cannot be read is a failure of this hook too, not silence.
    error: error ?? scopeError,
    pagination,
    revalidate,
    /**
     * True when `loadAll` stopped at the page ceiling with more results outstanding —
     * the returned data is INCOMPLETE. Silently truncating looked identical to "that
     * is everything", so callers that count or filter over the whole set must say so.
     */
    isTruncated,
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

const getBearerToken = async (credential?: Credential) => {
  const alg = "ES256";
  // A caller that already read the credential passes it in, so the token is signed by
  // exactly the key that was checked against the cache identity.
  const selected = credential ?? (await readCredential());
  // Throws rather than returning undefined: a caller that skipped an undefined check
  // would carry on and report success for a request that was never sent.
  if (!selected) {
    throw new ATCError("Missing API credentials", "Add an App Store Connect API key to continue.");
  }
  const { apiKey, issuerID: issuerId } = selected;
  const privateKey = decodeBase64(selected.privateKey);

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
  /** Sign with this credential instead of re-reading the selection. See readCredential. */
  credential?: Credential,
): Promise<TypedResponse<T>> => {
  const bearerToken = await getBearerToken(credential);
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
