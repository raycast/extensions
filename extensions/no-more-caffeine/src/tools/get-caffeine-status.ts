import { calculateCaffeineMetrics, getBedtimeDate } from "../utils/caffeineModel";
import { getSettings } from "../utils/preferences";
import { formatDateTime } from "../utils/statsSvg";
import { getStatusMessage } from "../utils/statusHelpers";
import { getIntakes } from "../utils/storage";
import { commandUrl } from "./caffeine-input";

export default async function getCaffeineStatus() {
  const now = new Date();
  const settings = getSettings();
  const metrics = calculateCaffeineMetrics(await getIntakes(), settings, undefined, undefined, now);
  const bedtime = getBedtimeDate(settings.bedtime, false, now);

  return {
    asOf: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: formatDateTime(now),
    bedtime: bedtime.toISOString(),
    localBedtime: formatDateTime(bedtime),
    estimatedCaffeineNowMg: metrics.currentResidual,
    estimatedCaffeineAtBedtimeMg: metrics.predictedResidualAtBedtime,
    bedtimeLimitMg: settings.maxCaffeineAtBedtime,
    todayIntakeMg: metrics.todayTotal,
    dailyLimitMg: settings.dailyMaxCaffeine ?? null,
    status: getStatusMessage(metrics.status),
    timelineUrl: commandUrl("caffeine-timeline"),
  };
}
