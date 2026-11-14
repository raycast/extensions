import type { GeoOverviewEngine } from "../types/geo";

export function summarizeVisibility(engines: GeoOverviewEngine[]) {
  const mentions = engines.reduce((total, engine) => total + engine.mentions, 0);
  const checks = engines.reduce((total, engine) => total + engine.checks, 0);
  const positionTotal = engines.reduce(
    (total, engine) => total + (engine.avgPosition === null ? 0 : engine.avgPosition * engine.mentions),
    0,
  );
  const positionedMentions = engines.reduce(
    (total, engine) => total + (engine.avgPosition === null ? 0 : engine.mentions),
    0,
  );

  return {
    avgPosition: positionedMentions === 0 ? null : positionTotal / positionedMentions,
    checks,
    mentions,
    rate: checks === 0 ? 0 : mentions / checks,
  };
}
