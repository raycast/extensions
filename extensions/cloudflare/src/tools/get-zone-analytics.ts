import { getCloudflareService, withCloudflareAccessToken } from '../oauth';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
  /** Analytics window. Defaults to the last 24 hours. */
  period?: '24h' | '7d' | '30d';
}

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  const period = input.period ?? '24h';
  const hours = period === '24h' ? 24 : period === '7d' ? 24 * 7 : 24 * 30;
  const until = new Date();
  const since = new Date(until.getTime() - hours * 60 * 60 * 1000);
  const analytics = await getCloudflareService().getZoneAnalytics(
    context.zone.id,
    since,
    until,
  );
  return {
    accountId: context.account.id,
    accountName: context.account.name,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    period,
    ...analytics,
    requestCacheRatio:
      analytics.requests > 0
        ? analytics.cachedRequests / analytics.requests
        : 0,
    bandwidthCacheRatio:
      analytics.bandwidth > 0
        ? analytics.cachedBandwidth / analytics.bandwidth
        : 0,
  };
}

export default withCloudflareAccessToken(tool);
