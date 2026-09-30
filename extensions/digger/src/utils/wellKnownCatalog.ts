// GENERATED FILE — do not hand-edit entries; see the regeneration note below.
/**
 * The catalog of paths probed under `/.well-known/`.
 *
 * Body: IANA's Well-Known URIs registry, the authoritative list.
 *   https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml
 *   CSV: https://www.iana.org/assignments/well-known-uris/well-known-uris-1.csv (snapshot 2026-09-08)
 *   Note the `-1` — the unsuffixed `well-known-uris.csv` returns 404.
 *
 * Tail: `unregistered`, files that are widely deployed but were never
 * registered. Skipping them would miss the single richest file most sites
 * publish: `apple-app-site-association` routinely leaks an app's whole
 * internal route table and is not in the registry at all.
 *
 * The registry is checked in rather than fetched at runtime. It changes a
 * few times a year, and a live fetch would put a second network dependency
 * — with its own failure mode — in front of every dig.
 *
 * Entries a bare GET cannot answer carry `probe: false` and are excluded from
 * both the sweep and its denominator — see that field. When in doubt an entry
 * stays probed: a needless 404 costs one request, while wrongly excluding a real
 * document loses a finding silently.
 */

export type WellKnownStatus = "permanent" | "provisional" | "deprecated" | "obsoleted" | "unregistered";

export interface WellKnownEntry {
  /** Path segment under `/.well-known/`. */
  path: string;
  /** Registration status, or "unregistered" for the deployed-but-unlisted tail. */
  status: WellKnownStatus;
  /** Spec or documentation URL, where the registry gives a resolvable one. */
  reference?: string;
  /**
   * `false` for paths a bare GET cannot answer, which are excluded from the
   * sweep AND from its denominator.
   *
   * Two kinds. A PREFIX (`acme-challenge/<token>`, `pki-validation/<file>`) has
   * no representation of its own — the resource is one level down. A PROTOCOL
   * entry (`coap`, `edhoc`) is not carried over HTTP at all. Probing either
   * produces a 404 that says nothing about the host, and counting it inflates
   * "N of M paths probed" with questions that were never asked.
   *
   * `matrix` is here because its discovery documents are `matrix/client` and
   * `matrix/server`, which are listed separately and DO get probed.
   */
  probe?: false;
}

export const WELL_KNOWN_CATALOG: readonly WellKnownEntry[] = [
  {
    path: "acme-challenge",
    probe: false,
    /* prefix */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc8555",
  },
  { path: "agent-card.json", status: "permanent", reference: "https://a2a-protocol.org/latest/specification/" },
  {
    path: "amphtml",
    probe: false,
    /* prefix */ status: "provisional",
    reference: "https://developers.google.com/amp/cache/update-cache",
  },
  { path: "api-catalog", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9727" },
  {
    path: "appspecific",
    probe: false /* prefix */,
    status: "provisional",
    reference:
      "https://github.com/Vroo/well-known-uri-appspecific/blob/main/well-known-uri-for-application-specific-purposes.txt",
  },
  {
    path: "ashrae",
    probe: false /* prefix */,
    status: "permanent",
    reference: "http://www.bacnet.org/Addenda/Add-135-2012am-ppr3-draft-17_chair_approved.pdf",
  },
  {
    path: "assetlinks.json",
    status: "permanent",
    reference: "https://github.com/google/digitalassetlinks/blob/master/well-known/specification.md",
  },
  {
    path: "broadband-labels",
    status: "provisional",
    reference: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5681704",
  },
  {
    path: "brski",
    probe: false,
    /* prefix */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc8995",
  },
  { path: "caldav", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc6764" },
  { path: "carddav", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc6764" },
  {
    path: "change-password",
    status: "provisional",
    reference: "https://w3c.github.io/webappsec-change-password-url/#the-change-password-well-known-uri",
  },
  { path: "cmp", probe: false, /* prefix */ status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9811" },
  {
    path: "coap",
    probe: false,
    /* protocol */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc8323",
  },
  {
    path: "coap-eap",
    probe: false,
    /* protocol */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc9820",
  },
  {
    path: "core",
    probe: false,
    /* protocol */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc6690",
  },
  { path: "csaf", status: "provisional" },
  { path: "csaf-aggregator", status: "provisional" },
  { path: "csipaus", probe: false, /* prefix */ status: "provisional" },
  {
    path: "csvm",
    status: "permanent",
    reference: "https://www.w3.org/TR/tabular-data-model/#default-locations-and-site-wide-location-configuration",
  },
  {
    path: "cyclic-trigger",
    probe: false /* prefix */,
    status: "provisional",
    reference: "https://github.com/SmartStandards/.well-known.cyclic-trigger",
  },
  {
    path: "did-configuration.json",
    status: "provisional",
    reference: "https://identity.foundation/.well-known/resources/did-configuration",
  },
  { path: "did.json", status: "provisional", reference: "https://w3c-ccg.github.io/did-method-web" },
  { path: "dnt", status: "permanent", reference: "http://www.w3.org/TR/tracking-dnt/#status-resource" },
  { path: "dnt-policy.txt", status: "permanent", reference: "https://www.eff.org/dnt-policy" },
  { path: "dots", probe: false, /* prefix */ status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9132" },
  {
    path: "easy-proxy",
    probe: false /* prefix */,
    status: "provisional",
    reference: "https://github.com/bytedance/g3/blob/master/doc/easy-proxy.md",
  },
  { path: "ecips", probe: false, /* prefix */ status: "provisional", reference: "https://ecips.that.world/24-ECIPURI" },
  {
    path: "edhoc",
    probe: false,
    /* protocol */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc9528",
  },
  { path: "enterprise-network-security", probe: false, /* prefix */ status: "permanent" },
  { path: "enterprise-transport-security", probe: false, /* prefix */ status: "permanent" },
  { path: "est", probe: false, /* prefix */ status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7030" },
  { path: "funding-manifest-urls", status: "provisional", reference: "https://fundingjson.org/" },
  { path: "genid", probe: false, /* prefix */ status: "permanent" },
  { path: "gnap-as-rs", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9767" },
  { path: "gpc.json", status: "provisional" },
  { path: "gs1resolver", status: "permanent" },
  { path: "hoba", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7486" },
  { path: "host-meta", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc6415" },
  { path: "host-meta.json", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc6415" },
  { path: "hosting-provider", status: "provisional", reference: "https://github.com/Automattic/hosting-provider" },
  { path: "http-opportunistic", status: "obsoleted", reference: "https://www.rfc-editor.org/rfc/rfc8164" },
  {
    path: "ic-domains",
    status: "provisional",
    reference:
      "https://docs.internetcomputer.org/building-apps/frontends/custom-domains/using-custom-domains#step-2-create-a-file-named-ic-domains-in-your-canister-under-the-well-known-directory-containing-the-custom-domain",
  },
  { path: "idp-proxy", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc8827" },
  { path: "jmap", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc8620" },
  { path: "keybase.txt", status: "permanent", reference: "https://keybase.io/__/keybase_well_known" },
  {
    path: "knx",
    probe: false,
    /* prefix */ status: "provisional",
    reference: "https://knxcloud.org/index.php/s/jdZXpCC3EolQgH2/download",
  },
  { path: "looking-glass", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc8522" },
  {
    path: "masque",
    probe: false,
    /* prefix */ status: "permanent",
    reference: "https://www.rfc-editor.org/rfc/rfc9298",
  },
  {
    path: "matrix",
    probe: false /* prefix */,
    status: "permanent",
    reference: "https://spec.matrix.org/latest/client-server-api/#well-known-uri",
  },
  { path: "mercure", status: "provisional", reference: "https://mercure.rocks/spec" },
  { path: "mta-sts.txt", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc8461" },
  { path: "mud", probe: false, /* retired */ status: "obsoleted" },
  { path: "nfv-oauth-server-configuration", status: "permanent" },
  { path: "ni", probe: false, /* prefix */ status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc6920" },
  { path: "nodeinfo", status: "provisional", reference: "https://nodeinfo.diaspora.software/" },
  { path: "nostr.json", status: "provisional", reference: "https://github.com/nostr-protocol/nips/blob/master/05.md" },
  { path: "oauth-authorization-server", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc8414" },
  { path: "oauth-protected-resource", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9728" },
  { path: "ohttp-gateway", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9540" },
  { path: "ojobpub.json", status: "provisional", reference: "https://docs.letsemploy.org" },
  {
    path: "open-resource-discovery",
    status: "provisional",
    reference: "https://sap.github.io/open-resource-discovery/",
  },
  { path: "openbindings", status: "provisional", reference: "https://openbindings.com/spec" },
  {
    path: "openid-configuration",
    status: "permanent",
    reference: "http://openid.net/specs/openid-connect-discovery-1_0.html",
  },
  { path: "openid-federation", status: "provisional" },
  { path: "openorg", status: "permanent", reference: "http://opd.data.ac.uk/" },
  {
    path: "oslc",
    status: "permanent",
    reference: "https://docs.oasis-open-projects.org/oslc-op/core/v3.0/ps01/oslc-core.html",
  },
  { path: "pki-validation", probe: false, /* prefix */ status: "permanent" },
  { path: "posh", probe: false, /* prefix */ status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7711" },
  {
    path: "privacy-sandbox-attestations.json",
    status: "deprecated",
    reference: "https://github.com/privacysandbox/attestation",
  },
  { path: "private-token-issuer-directory", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9578" },
  { path: "probing.txt", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9511" },
  { path: "pvd", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc8801" },
  { path: "rd", probe: false, /* prefix */ status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9176" },
  {
    path: "related-website-set.json",
    status: "deprecated",
    reference: "https://github.com/GoogleChrome/related-website-sets/blob/main/Well-Known-Specification.md",
  },
  { path: "reload-config", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc6940" },
  { path: "repute-template", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7072" },
  { path: "resourcesync", status: "permanent", reference: "http://www.openarchives.org/rs/resourcesync" },
  { path: "sbom", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9472" },
  { path: "scitt-keys", status: "permanent" },
  { path: "security.txt", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc9116" },
  {
    path: "ssf-configuration",
    status: "provisional",
    reference: "https://openid.net/specs/openid-sharedsignals-framework-1_0-ID2.html",
  },
  { path: "ssh-known-hosts", status: "provisional", reference: "https://c2sp.org/well-known-ssh-hosts" },
  { path: "sshfp", status: "provisional", reference: "https://sshfp.github.io/sshfp.html" },
  { path: "stun-key", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7635" },
  { path: "tdmrep.json", status: "provisional", reference: "https://www.w3.org/2022/tdmrep/" },
  { path: "tea", probe: false, /* prefix */ status: "provisional" },
  {
    path: "terraform.json",
    status: "provisional",
    reference: "https://developer.hashicorp.com/terraform/internals/remote-service-discovery",
  },
  { path: "thread", status: "permanent", reference: "https://www.threadgroup.org/support#specifications" },
  { path: "time", status: "permanent", reference: "http://phk.freebsd.dk/time/20151129/" },
  { path: "timezone", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7808" },
  { path: "tor-relay", probe: false, /* prefix */ status: "provisional" },
  { path: "tpcd", status: "deprecated" },
  {
    path: "traffic-advice",
    status: "provisional",
    reference: "https://buettner.github.io/private-prefetch-proxy/traffic-advice.html",
  },
  {
    path: "trust.txt",
    status: "provisional",
    reference: "https://journallist.net/reference-document-for-trust-txt-specifications",
  },
  { path: "uma2-configuration", status: "permanent" },
  {
    path: "vacation-rental.json",
    status: "provisional",
    reference: "https://vacationrentalprotocol.com/spec/well-known-uri-v0.1",
  },
  { path: "void", status: "permanent", reference: "http://www.w3.org/TR/void" },
  { path: "webauthn", status: "permanent", reference: "https://www.w3.org/TR/webauthn-3/#well-known-uri-registration" },
  { path: "webfinger", status: "permanent", reference: "https://www.rfc-editor.org/rfc/rfc7033" },
  {
    path: "webhook-authorized-senders.json",
    status: "permanent",
    reference: "https://intempus.dk/webhook-authorization",
  },
  { path: "webweaver.json", status: "provisional", reference: "https://www.webweaver.de/well-known" },
  { path: "wot", status: "permanent", reference: "https://www.w3.org/TR/wot-discovery/#introduction-well-known" },
  {
    path: "xregistry",
    probe: false /* prefix */,
    status: "provisional",
    reference: "https://xregistry.io/xreg/xregistryspecs/core-v1/docs/spec.html",
  },
  // `matrix` is registered as a PREFIX: the discovery documents live under it,
  // and a bare GET on the prefix 404s while the real files sit one level down.
  {
    path: "matrix/client",
    status: "unregistered",
    reference: "https://spec.matrix.org/latest/client-server-api/#getwell-knownmatrixclient",
  },
  {
    path: "matrix/server",
    status: "unregistered",
    reference: "https://spec.matrix.org/latest/server-server-api/#getwell-knownmatrixserver",
  },
  {
    path: "apple-app-site-association",
    status: "unregistered",
    reference: "https://developer.apple.com/documentation/xcode/supporting-associated-domains",
  }, // Universal Links / Associated Domains (Apple)
  { path: "ai.txt", status: "unregistered", reference: "https://site.spawning.ai/spawning-ai-txt" }, // AI training opt-out (Spawning)
  { path: "atproto-did", status: "unregistered", reference: "https://atproto.com/specs/handle" }, // AT Protocol handle resolution (Bluesky)
  { path: "discord", status: "unregistered", reference: "https://discord.com/developers/docs/resources/application" }, // Discord domain verification
  {
    path: "microsoft-identity-association.json",
    status: "unregistered",
    reference: "https://learn.microsoft.com/entra/identity-platform/howto-configure-publisher-domain",
  }, // Microsoft publisher domain verification
  {
    path: "passkey-endpoints",
    status: "unregistered",
    reference: "https://w3c.github.io/webauthn/#sctn-passkey-endpoints",
  }, // Passkey management endpoints (W3C)
] as const;
