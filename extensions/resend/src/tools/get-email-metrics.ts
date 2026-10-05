import { EmailMetricsGranularity, EmailMetric } from "resend";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** Start of the reporting range as an ISO 8601 date or datetime. */
  startDate?: string;
  /** End of the reporting range as an ISO 8601 date or datetime. */
  endDate?: string;
  /** IANA timezone used to group periods. Defaults to UTC. */
  timezone?: string;
  /** Time bucket size when returning period data. */
  granularity?: EmailMetricsGranularity;
  /** Metrics to return. Omit to return all available metrics. */
  metrics?: EmailMetric[];
  /** Limit metrics to these email IDs. */
  emailIds?: string[];
};

const tool = async (input: Input) => {
  const response = await getResend().emails.metrics({
    ...(input.startDate ? { startDate: input.startDate } : {}),
    ...(input.endDate ? { endDate: input.endDate } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    ...(input.granularity ? { granularity: input.granularity } : {}),
    ...(input.metrics?.length ? { metrics: input.metrics } : {}),
    ...(input.emailIds?.length ? { emailId: input.emailIds } : {}),
  });
  return unwrapResponse(response, "get email metrics");
};

export default withResend(tool);
