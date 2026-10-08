import axios from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import getScoreDates from "./scoreDates";

type GetScoresArgs = {
  league: string;
};

// One request per day is the only shape the scoreboard endpoint accepts for a
// span of days, so cap how many of them are in flight at once: the preference
// allows up to 30 previous days, and firing all 31 requests simultaneously at a
// public endpoint is what gets a client rate-limited.
const REQUEST_BATCH_SIZE = 5;

const readableDate = (date: string) => date.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");

const getScores = async ({ league }: GetScoresArgs) => {
  const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard`;
  const { numDaysScores } = getPreferenceValues<Preferences>();

  const dates = getScoreDates(new Date(), numDaysScores);

  const requestScores = (date: string) =>
    axios.get(baseUrl, {
      params: {
        region: "us",
        lang: "en",
        contentorigin: "espn",
        dates: date,
      },
    });

  // Batches settle one after another, and each batch keeps its own order, so
  // `responses` stays aligned with `dates` however the requests interleave.
  const responses: PromiseSettledResult<Awaited<ReturnType<typeof requestScores>>>[] = [];

  for (let start = 0; start < dates.length; start += REQUEST_BATCH_SIZE) {
    const batch = await Promise.allSettled(dates.slice(start, start + REQUEST_BATCH_SIZE).map(requestScores));
    responses.push(...batch);
  }

  const rejected = responses.filter((response): response is PromiseRejectedResult => response.status === "rejected");

  if (rejected.length === responses.length) {
    throw rejected[0].reason;
  }

  // A day that failed is simply missing from the scoreboard, which is
  // indistinguishable from a day without games: say so, rather than letting the
  // view present an incomplete scoreboard as if every day had answered. The
  // all-failed case above keeps throwing, so the hook still reports the outage.
  const failedDates = dates.filter((_, index) => responses[index].status === "rejected");

  if (failedDates.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Scores for ${failedDates.length} ${failedDates.length === 1 ? "day" : "days"} did not load`,
      message: failedDates.map(readableDate).join(", "),
    });
  }

  return responses.flatMap((response) => (response.status === "fulfilled" ? (response.value.data.events ?? []) : []));
};

export default getScores;
