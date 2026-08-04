import { domainPageUrl, getSurface, normalizeDomain, surfacePageUrl } from "../api";

type Input = {
  /**
   * Domain to inspect. You may pass a bare domain like "stripe.com" or a URL such as "https://stripe.com/docs".
   */
  domain: string;
};

/**
 * Inspect a domain's stored integrations.sh surface document, including available surfaces and credential setup.
 */
export default async function tool(input: Input) {
  const domain = normalizeDomain(input.domain);

  if (!domain) {
    throw new Error("Provide a domain to inspect, such as stripe.com.");
  }

  const surfaceDocument = await getSurface(domain);

  return {
    domain: surfaceDocument.domain,
    summary: surfaceDocument.summary,
    description: surfaceDocument.description,
    discoveredAt: surfaceDocument.discoveredAt,
    pageUrl: domainPageUrl(surfaceDocument.domain),
    credentials: Object.entries(surfaceDocument.credentials ?? {}).map(([id, credential]) => ({
      id,
      type: credential.type,
      label: credential.label,
      acquisition: credential.acquisition,
      generateUrl: credential.generateUrl,
      setup: credential.setup,
      fields: credential.fields,
    })),
    surfaces: surfaceDocument.surfaces.map((surface) => ({
      slug: surface.slug,
      name: surface.name,
      type: surface.type,
      url: surface.url,
      docs: surface.docs,
      spec: surface.spec,
      transports: surface.transports,
      command: surface.command,
      packages: surface.packages,
      auth: surface.auth,
      notes: surface.notes,
      pageUrl: surfacePageUrl(surfaceDocument.domain, surface.slug),
    })),
  };
}
