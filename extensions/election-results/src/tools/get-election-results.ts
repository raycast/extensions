import { findElection, loadSnapshot, phaseOf, statusText } from "../election";

type Input = {
  /**
   * The election's id, such as "br:6258", from the list-elections tool.
   * Leave it out for the newest election.
   */
  electionId?: string;
};

/**
 * Get the results of one election from the official source: where the count is (phase and share
 * counted), every candidate with party, running mate, votes, share of valid votes and outcome, the
 * winner if there is one, and the gap between the first two. Shares are percentages of valid votes.
 */
export default async function tool(input: Input) {
  const election = await findElection(input.electionId);
  if (!election) throw new Error("The source lists no election.");
  const snapshot = await loadSnapshot(election);
  const phase = phaseOf(snapshot);
  const [first, second] = snapshot.candidates;
  const counted = snapshot.reportingPercent > 0;

  return {
    id: snapshot.id,
    country: snapshot.country,
    title: snapshot.title,
    phase,
    status: statusText(snapshot, phase),
    reportingPercent: snapshot.reportingPercent,
    countFinished: snapshot.finished,
    pollsOpen: snapshot.pollsOpen,
    pollsClose: snapshot.pollsClose,
    timeZone: snapshot.timeZone,
    sourceUpdatedAt: snapshot.updatedAt,
    winner: snapshot.candidates.find((candidate) => candidate.elected)?.name ?? null,
    gapBetweenFirstTwo:
      counted && first && second
        ? {
            percentagePoints: Number((first.percent - second.percent).toFixed(2)),
            votes: first.votes - second.votes,
          }
        : null,
    candidates: snapshot.candidates.map((candidate) => ({
      name: candidate.name,
      fullName: candidate.fullName,
      party: candidate.party,
      runningMate: candidate.runningMate,
      votes: candidate.votes,
      percent: candidate.percent,
      outcome: candidate.outcome,
    })),
    source: "Tribunal Superior Eleitoral (TSE), Brazil's electoral court",
    sourceUrl: snapshot.resultsUrl,
  };
}
