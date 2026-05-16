import { PostHogAPIError } from "../api/client";
import { generateHogql } from "../api/query";
import { getActiveProjectId } from "./_shared";

type Input = {
  /**
   * Natural-language question about the project's data — e.g. "what's our DAU this week".
   *
   * NOTE: This tool calls PostHog's Max AI generator, which requires Max AI to be enabled
   * on the project (currently a paid PostHog Cloud feature). If it's not available, you can
   * write the HogQL yourself and pass it directly to `query-run` via its `hogql` parameter.
   * HogQL is PostHog's ClickHouse-flavored SQL — the `events` table has columns
   * `timestamp`, `event`, `person_id`, `distinct_id`, and `properties`.
   */
  question: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  try {
    const result = await generateHogql(projectId, input.question);
    if (result.error) throw new Error(result.error);
    return { hogql: result.hogql };
  } catch (e) {
    if (e instanceof PostHogAPIError && (e.status === 403 || e.status === 404 || e.status === 501)) {
      throw new Error(
        "Max AI isn't enabled on this PostHog project (or your key lacks the scope). " +
          "Write the HogQL yourself and call `query-run` with `hogql: <your-query>` instead. " +
          "The `events` table has `timestamp`, `event`, `person_id`, `distinct_id`, `properties` columns.",
      );
    }
    throw e;
  }
}
