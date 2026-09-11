import * as dns from "dns";
import * as tls from "tls";
import { promisify } from "util";
import { DNSData, DNSRecordKind } from "../types";
import { LIMITS, TIMEOUTS } from "./config";

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveNs = promisify(dns.resolveNs);
const resolveCname = promisify(dns.resolveCname);

export async function performDNSLookup(hostname: string): Promise<DNSData> {
  const dnsData: DNSData = {};
  // A record type having no entries is normal — plenty of hosts have no AAAA or
  // no MX — so each lookup below still swallows on its own. What is NOT normal is
  // every type failing: that means the resolver is down or the name does not
  // resolve, and it must reach the caller instead of returning an empty object
  // the UI renders as "no records found".
  //
  // Keep the first error that is NOT benign, rather than the first error of any
  // kind. Every query below can fail benignly, and those arrive in query order —
  // so remembering "the first error" would let one harmless A-record miss
  // permanently mask a resolver that died on the five queries after it, and the
  // lookup would return {} to be rendered as "no records found".
  //
  // The BENIGN set is the closed one, so it is the one to enumerate. Node
  // surfaces 24 distinct DNS error codes and only these two mean "DNS answered,
  // and the answer is that this record does not exist"; the other 22 — EBADRESP,
  // EFORMERR, ENOMEM, ECANCELLED, ENOTINITIALIZED and the rest — all mean the
  // check did not complete. Listing the FAILURE codes instead is fail-open: any
  // code missing from that list is discarded as though nothing went wrong, which
  // is the same "a failed check reports as an empty one" defect this function
  // exists to avoid.
  //
  // The other 22 codes need no individual handling: 9 are genuine failures to
  // complete ("Couldn't check" is exactly right), and 8 are client-side argument
  // rejections that cannot arrive here — `hostname` comes from `new URL()`, and a
  // name malformed enough to trip them fails the main fetch anyway, so the user
  // already has a top-level error. ECANCELLED is the ONE code that would be
  // mislabelled, since cancellation is not failure; it is unreachable today
  // because this function takes no signal and never constructs a dns.Resolver.
  // Give it one, and add ECANCELLED here at the same time.
  const BENIGN = new Set([
    "ENODATA", // the name resolves, but publishes no record of this type
    "ENOTFOUND", // the name is not in DNS at all
  ]);
  let resolverError: unknown;
  // Which record types we failed to CHECK, as opposed to checked and found empty.
  // Recorded per type because one failed query does not invalidate the others:
  // a host can answer for A and time out for MX, and reporting "no mail servers"
  // there is a claim about the host we did not earn.
  const unchecked: DNSRecordKind[] = [];
  const note = (kind: DNSRecordKind, e: unknown) => {
    const code = (e as NodeJS.ErrnoException | undefined)?.code;
    if (code !== undefined && BENIGN.has(code)) return;
    unchecked.push(kind);
    if (resolverError === undefined) resolverError = e;
  };

  try {
    const aRecords = await resolve4(hostname);
    if (aRecords.length > 0) {
      dnsData.aRecords = aRecords;
    }
  } catch (e) {
    note("a", e);
  }

  try {
    const aaaaRecords = await resolve6(hostname);
    if (aaaaRecords.length > 0) {
      dnsData.aaaaRecords = aaaaRecords;
    }
  } catch (e) {
    note("aaaa", e);
  }

  try {
    const mxRecords = await resolveMx(hostname);
    if (mxRecords.length > 0) {
      dnsData.mxRecords = mxRecords;
    }
  } catch (e) {
    note("mx", e);
  }

  try {
    const txtRecords = await resolveTxt(hostname);
    if (txtRecords.length > 0) {
      dnsData.txtRecords = txtRecords.map((record) => record.join(""));
    }
  } catch (e) {
    note("txt", e);
  }

  try {
    const nsRecords = await resolveNs(hostname);
    if (nsRecords.length > 0) {
      dnsData.nsRecords = nsRecords;
    }
  } catch (e) {
    note("ns", e);
  }

  try {
    const cnameRecords = await resolveCname(hostname);
    if (cnameRecords.length > 0) {
      dnsData.cnameRecord = cnameRecords[0];
    }
  } catch (e) {
    note("cname", e);
  }

  // Only a RESOLVER-level failure is worth reporting. "No such record" is not:
  // `dns.resolve*` queries DNS directly, bypassing the OS resolver, so a host
  // that works via /etc/hosts, mDNS, or an IP literal legitimately has no records
  // and would otherwise banner an error on a page that loaded perfectly. A domain
  // that genuinely does not exist is already reported by the main fetch failing,
  // so nothing is lost by staying quiet here.
  // Records from ANY query mean the resolver worked; report what we got.
  // Every query failing benignly stays quiet: `dns.resolve*` bypasses the OS
  // resolver, so a host reachable via /etc/hosts, mDNS, or an IP literal
  // legitimately publishes nothing and must not banner an error on a page that
  // loaded perfectly.
  if (Object.keys(dnsData).length === 0 && resolverError !== undefined) {
    throw resolverError;
  }

  // Records from SOME queries and failures on others is a partial result, not a
  // whole one. Throwing would discard records we actually have; returning
  // silently would present the unchecked types as absent. Carry the list instead
  // so each row can say which it is.
  if (unchecked.length > 0) {
    dnsData.unchecked = unchecked;
  }

  return dnsData;
}

export interface CertificateInfo {
  issuer?: string;
  subject?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  certificateChain?: string[];
}

export async function getTLSCertificateInfo(hostname: string, port = LIMITS.TLS_PORT): Promise<CertificateInfo | null> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate(true);

        if (!cert || Object.keys(cert).length === 0) {
          socket.destroy();
          resolve(null);
          return;
        }

        const certInfo: CertificateInfo = {};

        if (cert.issuer) {
          certInfo.issuer = formatCertificateName(cert.issuer);
        }

        if (cert.subject) {
          certInfo.subject = formatCertificateName(cert.subject);
        }

        if (cert.valid_from) {
          certInfo.validFrom = cert.valid_from;
        }

        if (cert.valid_to) {
          certInfo.validTo = cert.valid_to;
          const expiryDate = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          certInfo.daysUntilExpiry = daysUntilExpiry;
        }

        const chain: string[] = [];
        let currentCert = cert as typeof cert & { issuerCertificate?: typeof cert };
        while (currentCert && currentCert.issuerCertificate) {
          if (currentCert.issuerCertificate === currentCert) {
            break;
          }
          chain.push(formatCertificateName(currentCert.issuerCertificate.subject));
          currentCert = currentCert.issuerCertificate;
        }
        if (chain.length > 0) {
          certInfo.certificateChain = chain;
        }

        socket.destroy();
        resolve(certInfo);
      },
    );

    // Reject rather than resolve(null). The caller wraps this in withAbort(...,
    // null), which turns a rejection back into exactly that null — so the value
    // the UI sees is unchanged, but the reason survives and can be reported.
    //
    // EXCEPT when nothing is listening on 443. A site served over plain HTTP has
    // no TLS to report on, and `normalizeUrl` keeps an explicit `http://` while
    // `fetchHeadOnlyWithFallback` can also drop an https attempt down to http —
    // so this is an ordinary, benign case, not a degraded HTTPS lookup. Treat it
    // like the "peer presented no certificate" branch above: an answer, not a
    // failure. Anything else (handshake rejected, bad cert, timeout) is real.
    const NO_TLS_SERVICE = new Set(["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND"]);
    socket.on("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code && NO_TLS_SERVICE.has(code)) {
        resolve(null);
        return;
      }
      reject(err);
    });

    socket.setTimeout(TIMEOUTS.TLS_SOCKET, () => {
      socket.destroy();
      reject(new Error(`TLS handshake timed out after ${TIMEOUTS.TLS_SOCKET}ms`));
    });
  });
}

function formatCertificateName(name: unknown): string {
  if (typeof name === "string") {
    return name;
  }

  if (typeof name !== "object" || name === null) {
    return String(name);
  }

  const certName = name as Record<string, unknown>;
  const parts: string[] = [];
  if (certName.CN) parts.push(`CN=${certName.CN}`);
  if (certName.O) parts.push(`O=${certName.O}`);
  if (certName.OU) parts.push(`OU=${certName.OU}`);
  if (certName.C) parts.push(`C=${certName.C}`);
  if (certName.ST) parts.push(`ST=${certName.ST}`);
  if (certName.L) parts.push(`L=${certName.L}`);

  return parts.join(", ") || JSON.stringify(name);
}
