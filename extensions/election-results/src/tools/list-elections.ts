import { listElections } from "../election";

/**
 * List the elections this extension has results for, newest first.
 * Use it to find an election's id before asking for its results, or to answer which elections exist
 * and when they take place. Each election has its voting window as ISO 8601 timestamps.
 */
export default async function tool() {
  const elections = await listElections();
  return elections.map(({ id, country, title, pollsOpen, pollsClose, timeZone }) => ({
    id,
    country,
    title,
    pollsOpen,
    pollsClose,
    timeZone,
  }));
}
