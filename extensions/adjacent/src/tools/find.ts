import { findEntities } from '../lib/api';
import type { EntityType } from '../lib/types';

type Input = {
  /** Free-text topic, name, or ticker (e.g. "2028 presidential", "bitcoin", "RED"). */
  query: string;
  /** Optional entity-type filter: index, rate, event, market, or news. */
  type?: EntityType;
  /** Max hits per entity kind (default 8, cap 25). */
  limit?: number;
};

/** Discover Adjacent entities by topic when you do not have an id yet. */
export default async function tool(input: Input) {
  return findEntities(input.query, input.type, input.limit ?? 8);
}
