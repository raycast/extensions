import { inspectGroundPackets } from "../services/ledger";
import { queryRecords } from "../domain/query";
/** Read-only search of saved local records, latest versions by default. */
type Input = {
  query?: string;
  includeHistory?: boolean;
  offset?: number;
  limit?: number;
};
export default async function tool(input: Input) {
  const result = queryRecords(await inspectGroundPackets(), input, (r) =>
    JSON.stringify(r),
  );
  return JSON.stringify({
    ...result,
    records: result.records.map((r) => ({
      id: r.id,
      rootId: r.rootId,
      version: r.version,
      title: r.draft.title,
      createdAt: r.createdAt,
    })),
  });
}
