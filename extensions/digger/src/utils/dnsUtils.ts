import * as dns from "dns";
import * as tls from "tls";
import { promisify } from "util";
import { DNSData } from "../types";
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
  let firstError: unknown;
  const note = (e: unknown) => {
    if (firstError === undefined) firstError = e;
  };

  try {
    const aRecords = await resolve4(hostname);
    if (aRecords.length > 0) {
      dnsData.aRecords = aRecords;
    }
  } catch (e) {
    note(e); // A records not found
  }

  try {
    const aaaaRecords = await resolve6(hostname);
    if (aaaaRecords.length > 0) {
      dnsData.aaaaRecords = aaaaRecords;
    }
  } catch (e) {
    note(e); // AAAA records not found
  }

  try {
    const mxRecords = await resolveMx(hostname);
    if (mxRecords.length > 0) {
      dnsData.mxRecords = mxRecords;
    }
  } catch (e) {
    note(e); // MX records not found
  }

  try {
    const txtRecords = await resolveTxt(hostname);
    if (txtRecords.length > 0) {
      dnsData.txtRecords = txtRecords.map((record) => record.join(""));
    }
  } catch (e) {
    note(e); // TXT records not found
  }

  try {
    const nsRecords = await resolveNs(hostname);
    if (nsRecords.length > 0) {
      dnsData.nsRecords = nsRecords;
    }
  } catch (e) {
    note(e); // NS records not found
  }

  try {
    const cnameRecords = await resolveCname(hostname);
    if (cnameRecords.length > 0) {
      dnsData.cnameRecord = cnameRecords[0];
    }
  } catch (e) {
    note(e); // CNAME records not found
  }

  // Only a RESOLVER-level failure is worth reporting. "No such record" is not:
  // `dns.resolve*` queries DNS directly, bypassing the OS resolver, so a host
  // that works via /etc/hosts, mDNS, or an IP literal legitimately has no records
  // and would otherwise banner an error on a page that loaded perfectly. A domain
  // that genuinely does not exist is already reported by the main fetch failing,
  // so nothing is lost by staying quiet here.
  const RESOLVER_FAILURE = new Set(["ESERVFAIL", "ETIMEOUT", "ECONNREFUSED", "EREFUSED"]);
  const code = (firstError as NodeJS.ErrnoException | undefined)?.code;
  if (Object.keys(dnsData).length === 0 && code !== undefined && RESOLVER_FAILURE.has(code)) {
    throw firstError;
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
