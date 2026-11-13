import {
  getBotStats,
  getDdosProtectionMode,
  getDdosStats,
  getServiceDetails,
  isBotManagementEnabled,
  isDdosProtectionEnabled,
} from "../api";

type Input = {
  /** The service ID. Resolve a service name to its ID with the get-services tool first. */
  serviceId: string;
};

/**
 * Get the security posture of a Fastly service: whether Bot Management and
 * DDoS Protection are enabled, the DDoS Protection mode ("log" observes attacks,
 * "block" mitigates them), and the last 24 hours of bot and DDoS activity
 * (bot requests analyzed/detected by category, DDoS requests detected/mitigated).
 */
export default async function ({ serviceId }: Input) {
  const [details, botEnabled, ddosEnabled] = await Promise.all([
    getServiceDetails(serviceId),
    isBotManagementEnabled(serviceId),
    isDdosProtectionEnabled(serviceId),
  ]);

  const [botStats, ddosMode, ddosStats] = await Promise.all([
    botEnabled ? getBotStats(serviceId) : Promise.resolve(null),
    ddosEnabled ? getDdosProtectionMode(serviceId) : Promise.resolve(undefined),
    ddosEnabled ? getDdosStats(serviceId) : Promise.resolve(null),
  ]);

  return {
    service: details.name,
    bot_management: {
      enabled: botEnabled,
      ...(botStats
        ? {
            last_24h: {
              requests_analyzed: botStats.analyzed,
              bots_detected: botStats.detected,
              challenges_issued: botStats.challenges_issued,
              challenges_succeeded: botStats.challenges_succeeded,
              challenges_failed: botStats.challenges_failed,
              by_bot_type: botStats.byType,
            },
          }
        : {}),
    },
    ddos_protection: {
      enabled: ddosEnabled,
      ...(ddosEnabled ? { mode: ddosMode } : {}),
      ...(ddosStats
        ? {
            last_24h: {
              total_requests: ddosStats.requests,
              allowed: ddosStats.allowed,
              detected: ddosStats.detected,
              mitigated: ddosStats.mitigated,
            },
          }
        : {}),
    },
  };
}
