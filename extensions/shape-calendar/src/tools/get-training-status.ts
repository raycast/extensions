import { getTrainingStatus } from "../api/client";

type Input = {
  /**
   * Start date in ISO format (YYYY-MM-DD). Only pass together with `to`, and only when the question is a trend over time. Omit both for today's snapshot plus the next 7 days.
   */
  from?: string;
  /**
   * End date in ISO format (YYYY-MM-DD). Only pass together with `from`.
   */
  to?: string;
};

export default async function (input: Input) {
  return getTrainingStatus({ from: input.from, to: input.to });
}
