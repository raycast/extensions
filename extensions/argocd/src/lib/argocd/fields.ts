/**
 * What the ArgoCD API can and cannot narrow down, and the measurements behind the read path.
 *
 * The ArgoCD web UI sends a `fields` query parameter on the applications list, which reads like
 * a server-side projection. It is not one: `ApplicationQuery` in the v3.5.1 proto has exactly
 * eight fields (name, refresh, projects, resourceVersion, selector, repo, appNamespace,
 * project), `fields` is not among them, and the server's own swagger.json does not document it.
 * The parameter is accepted and ignored, so sending it would only be misleading. Do not add it.
 *
 * What the API does support for narrowing a list is here, and it is what this module exists to
 * document:
 *   - `projects`  restrict to one or more AppProjects
 *   - `selector`  a label selector
 *   - `repo`      restrict to one repository URL
 *   - `appNamespace` restrict to one application namespace
 *
 * Measured on a real instance holding 2053 applications (tests/lib/real-instance.test.ts
 * re-runs the projection and ranking half of this against your own instance):
 *   - compact JSON of the full list        30.2 MB
 *   - the same list gzipped                 2.97 MB   (what actually crosses the network)
 *   - JSON.parse of the full list             85 ms
 *   - peak heap while projecting              ~51 MB
 *   - the projection that gets cached        1.49 MB
 *   - applications dropped by the projection       0
 *   - ranking the whole corpus, worst case   7.4 ms   (a single-letter query, so every row
 *                                                      matches; a keystroke has ~16 ms)
 *
 * And the constraint that decides the shape of the read path: a Raycast command gets a
 * **100 MB JS heap**. Holding that list is not an option. `response.json()` on it peaks at
 * 58 MB for one instance, because the body exists as a UTF-16 string and as an object graph at
 * the same time; two instances in parallel exceed the limit and kill the command. Streaming the
 * same list and projecting element by element peaks at 35 MB, and 43 MB for two instances read
 * one after the other.
 *
 * So: one full list per refresh is affordable, holding it is not, and re-fetching it on every
 * keystroke would be absurd. The response is streamed and projected element by element
 * (stream.ts, project.ts), the projection is what gets cached to disk (cache/store.ts), the raw
 * response is never retained, and instances are refreshed one at a time so the peak stays flat
 * as instances are added.
 */

/** Query parameters the applications list actually honours. */
export const SUPPORTED_LIST_FILTERS = ["projects", "selector", "repo", "appNamespace"] as const;

/** Measured compressed size of one full applications list, for the docs and the tests. */
export const MEASURED_LIST_GZIP_BYTES = 2_972_621;
export const MEASURED_LIST_APPLICATIONS = 2053;
