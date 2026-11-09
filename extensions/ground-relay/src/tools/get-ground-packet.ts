import { inspectGroundPackets } from "../services/ledger";
import { getRecord } from "../domain/query";
type Input = {
  /** Exact record ID returned by list-ground-packets; never guess an ID. */ id: string;
};
export default async function tool(input: Input) {
  return JSON.stringify(getRecord(await inspectGroundPackets(), input.id));
}
