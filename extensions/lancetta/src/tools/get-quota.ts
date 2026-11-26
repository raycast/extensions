import {
  Agent,
  currentAdvice,
  formatSpan,
  isStale,
  loadSnapshot,
  nowSeconds,
  STALE_SECONDS,
  Window,
} from "../lib/snapshot";

/**
 * How much of each coding agent's quota (Claude, Codex) is left, when each window resets, whether
 * the account is refusing requests, and Lancetta's own suggestions -- including whether the
 * current pace runs out before the reset. Read-only: it reads the file the Lancetta app writes.
 */
export default async function tool() {
  // a missing or unreadable file throws a message the model can relay: install or launch Lancetta
  const snapshot = await loadSnapshot();
  const now = nowSeconds();
  const documentAge = now - snapshot.writtenAt;

  return {
    lancettaVersion: snapshot.app,
    lancettaRunning: !isStale(snapshot.writtenAt, now),
    lastWritten: `${formatSpan(documentAge)} ago`,
    note: isStale(snapshot.writtenAt, now)
      ? `Lancetta has not written for over ${STALE_SECONDS / 60} minutes, so it is probably not running: every number below is as old as its readAgo.`
      : undefined,
    agents: snapshot.agents.map((agent) => describeAgent(agent, now)),
    // only the advice still about now: an agent's advice rests on its reading, which can be old
    advice: currentAdvice(snapshot, now).map((item) => ({
      kind: item.kind,
      tone: item.tone,
      agent: item.agent,
      title: item.title,
      steps: item.steps,
      basis: item.basis,
      when: item.at ? new Date(item.at * 1000).toISOString() : null,
      mostUrgent: item.first,
    })),
  };
}

function describeAgent(agent: Agent, now: number) {
  const reading = agent.reading;
  if (!reading) {
    return {
      agent: agent.agent,
      reading: null,
      problem: agent.problem
        ? {
            code: agent.problem.code,
            title: agent.problem.title,
            message: agent.problem.message,
            isTransientState: agent.problem.state,
          }
        : "No reading yet: Lancetta has not finished its first poll.",
    };
  }
  return {
    agent: agent.agent,
    plan: reading.plan,
    readAgo: formatSpan(now - reading.observedAt),
    readingIsStale: isStale(reading.observedAt, now),
    blocked: reading.blocked,
    blockedBy: reading.blockedBucket,
    fiveHourWindow: describeWindow(reading.fiveHour, now),
    sevenDayWindow: describeWindow(reading.sevenDay, now),
    perModelWindows: reading.models.map((model) => ({
      model: model.label,
      group: model.group,
      ...describeWindow({ usedPercent: model.usedPercent, resetsAt: model.resetsAt }, now),
    })),
    freeResetsAvailable: reading.resetCreditsAvailable,
    problem: agent.problem
      ? { code: agent.problem.code, title: agent.problem.title, message: agent.problem.message }
      : null,
  };
}

function describeWindow(window: Window, now: number) {
  if (window.absent) return { notOnThisPlan: true };
  return {
    usedPercent: window.usedPercent,
    leftPercent: window.usedPercent === null ? null : Math.max(0, 100 - window.usedPercent),
    resetsAt: window.resetsAt ? new Date(window.resetsAt * 1000).toISOString() : null,
    resetsIn: window.resetsAt ? (window.resetsAt > now ? formatSpan(window.resetsAt - now) : "due now") : null,
  };
}
