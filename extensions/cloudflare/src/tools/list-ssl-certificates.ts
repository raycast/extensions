import { getCloudflareService, withCloudflareAccessToken } from '../oauth';
import { certificateHealth, certificatePackHealth } from '../insights-utils';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
}

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  const packs = await getCloudflareService().listCertificatePacks(
    context.zone.id,
  );
  return {
    accountId: context.account.id,
    accountName: context.account.name,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    certificatePacks: packs.map((pack) => {
      const summary = certificatePackHealth(
        pack.status,
        pack.certificates,
        pack.validationErrors,
      );
      return {
        id: pack.id,
        hosts: pack.hosts,
        status: pack.status,
        health: summary.health,
        earliestExpiresOn: summary.earliestExpiresOn,
        type: pack.type,
        certificateAuthorities: [
          ...new Set(
            pack.certificates
              .map((certificate) => certificate.issuer)
              .filter((issuer): issuer is string => Boolean(issuer)),
          ),
        ],
        certificateAuthority: pack.certificateAuthority,
        validationMethod: pack.validationMethod,
        validationErrors: pack.validationErrors,
        certificates: pack.certificates.map((certificate) => ({
          id: certificate.id,
          hosts: certificate.hosts,
          status: certificate.status,
          health: certificateHealth(certificate.status, certificate.expiresOn),
          expiresOn: certificate.expiresOn,
          issuer: certificate.issuer,
          signature: certificate.signature,
        })),
      };
    }),
  };
}

export default withCloudflareAccessToken(tool);
