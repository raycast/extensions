import { getTlsCertificates, getTlsSubscriptions } from "../api";

/**
 * List TLS certificates and managed TLS subscriptions on the account, with
 * expiry information. Each certificate includes days_until_expiry so
 * soon-to-expire certificates (30 days or fewer) can be flagged.
 */
export default async function () {
  const [certificates, subscriptions] = await Promise.all([getTlsCertificates(), getTlsSubscriptions()]);
  const now = Date.now();

  return {
    certificates: certificates.map((cert) => {
      const notAfter = cert.attributes.not_after;
      return {
        id: cert.id,
        name: cert.attributes.name,
        issued_to: cert.attributes.issued_to,
        issuer: cert.attributes.issuer,
        not_after: notAfter,
        days_until_expiry: notAfter ? Math.floor((new Date(notAfter).getTime() - now) / (24 * 60 * 60 * 1000)) : null,
        domains: cert.relationships?.tls_domains?.data?.map((domain) => domain.id) || [],
      };
    }),
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      state: sub.attributes.state,
      certificate_authority: sub.attributes.certificate_authority,
      has_active_order: sub.attributes.has_active_order,
      common_name: sub.relationships?.common_name?.data?.id,
      domains: sub.relationships?.tls_domains?.data?.map((domain) => domain.id) || [],
    })),
  };
}
