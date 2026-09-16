/**
 * Unit checks for Saturn deep-link URL parsing / builders.
 * Mirrors main/saturn/deep-links.ts parse rules (kept local so this test does
 * not need the Glaze backend stub).
 *
 * Run via: npm test
 */

const SATURN_URL_SCHEME = "glaze-1v0xag7h-local";

function collectionDeepLink(collectionId) {
  return `${SATURN_URL_SCHEME}://collection/${encodeURIComponent(collectionId)}`;
}

function parseSaturnDeepLink(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  const protocol = url.protocol.replace(/:$/, "");
  if (protocol !== SATURN_URL_SCHEME && protocol !== "com.glaze") {
    return null;
  }

  if (url.hostname === "cross-app") return null;

  const queryId = url.searchParams.get("collectionId");
  if (queryId && queryId.trim()) {
    return { kind: "collection", collectionId: queryId.trim() };
  }

  if (url.hostname === "collection") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    if (id) return { kind: "collection", collectionId: decodeURIComponent(id) };
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "collection" && parts[1]) {
    return { kind: "collection", collectionId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "open" && parts[1] === "collection" && parts[2]) {
    return { kind: "collection", collectionId: decodeURIComponent(parts[2]) };
  }

  if (url.hostname === "open" || parts[0] === "open" || parts.length === 0) {
    return { kind: "home" };
  }

  return null;
}

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

console.log("deep-link builders");
{
  const url = collectionDeepLink("687f485e-439d-48c9-84bc-5c096f2eb471");
  check(
    "builds host-style collection URL",
    url === "glaze-1v0xag7h-local://collection/687f485e-439d-48c9-84bc-5c096f2eb471",
  );
  check(
    "encodes special characters",
    collectionDeepLink("a/b") === "glaze-1v0xag7h-local://collection/a%2Fb",
  );
}

console.log("deep-link parsing");
{
  check(
    "parses host-style collection",
    parseSaturnDeepLink("glaze-1v0xag7h-local://collection/abc-123")?.collectionId === "abc-123",
  );
  check(
    "parses path-style collection",
    parseSaturnDeepLink("glaze-1v0xag7h-local:///collection/abc-123")?.collectionId === "abc-123",
  );
  check(
    "parses query collectionId",
    parseSaturnDeepLink("glaze-1v0xag7h-local://open?collectionId=xyz")?.collectionId === "xyz",
  );
  check(
    "ignores cross-app bootstrap",
    parseSaturnDeepLink("glaze-1v0xag7h-local://cross-app/bootstrap?token=x") === null,
  );
  check(
    "bare open → home",
    parseSaturnDeepLink("glaze-1v0xag7h-local://open")?.kind === "home",
  );
  check(
    "rejects foreign schemes",
    parseSaturnDeepLink("https://example.com/collection/abc") === null,
  );
  check(
    "round-trips builder",
    parseSaturnDeepLink(collectionDeepLink("design"))?.collectionId === "design",
  );
}

// Raycast extension deeplinks (mirrors src/lib/raycast-deeplinks.ts)
function raycastSearchDeeplink(query) {
  const base = "raycast://extensions/sachindabas/saturn/search-links";
  const trimmed = query?.trim();
  if (!trimmed) return base;
  return `${base}?arguments=${encodeURIComponent(JSON.stringify({ query: trimmed }))}`;
}

console.log("raycast extension deeplinks");
{
  check(
    "search deeplink without query",
    raycastSearchDeeplink() === "raycast://extensions/sachindabas/saturn/search-links",
  );
  check(
    "search deeplink with query",
    raycastSearchDeeplink("raycast") ===
      'raycast://extensions/sachindabas/saturn/search-links?arguments=%7B%22query%22%3A%22raycast%22%7D',
  );
}

if (failures > 0) {
  console.error(`\n${failures} deep-link check(s) failed`);
  process.exit(1);
}
console.log("deep-link checks passed\n");
