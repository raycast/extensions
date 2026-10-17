import { getClient } from "../lib/api";
type Input = { /** Build ID, or next_id from a canceled build. */ buildId: string };
export default function tool({ buildId }: Input) {
  return getClient().getBuild(buildId);
}
