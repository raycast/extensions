import { analyzeDnsHealth } from '../dns-health';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
}

async function tool(input: Input) {
  const accounts = await getCloudflareService().listAccounts();
  const zoneGroups = await Promise.all(
    accounts.map(async (account) => getCloudflareService().listZones(account)),
  );
  const zone = zoneGroups.flat().find((zone) => zone.id === input.zoneId);
  if (!zone)
    throw new Error('zoneId is not accessible. Call List Zones first.');

  const [records, dnssec] = await Promise.all([
    getCloudflareService().listDnsRecords(zone.id),
    getCloudflareService().getDnssec(zone.id),
  ]);
  const report = analyzeDnsHealth(zone.name, records, dnssec);
  return {
    zoneId: zone.id,
    zoneName: zone.name,
    score: report.score,
    findings: report.findings.map((finding) => ({
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      affectedRecordIds: finding.recordIds ?? [],
    })),
  };
}

export default withCloudflareAccessToken(tool);
