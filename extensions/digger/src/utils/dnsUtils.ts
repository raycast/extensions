import * as dns from "dns";
import * as tls from "tls";
import { promisify } from "util";
import { DNSData } from "../types";
import { TIMEOUTS, LIMITS } from "./config";

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveNs = promisify(dns.resolveNs);
const resolveCname = promisify(dns.resolveCname);

export async function performDNSLookup(hostname: string): Promise<DNSData> {
  const dnsData: DNSData = {};

  try {
    const aRecords = await resolve4(hostname);
    if (aRecords.length > 0) {
      dnsData.aRecords = aRecords;
    }
  } catch {
    // A records not found
  }

  try {
    const aaaaRecords = await resolve6(hostname);
    if (aaaaRecords.length > 0) {
      dnsData.aaaaRecords = aaaaRecords;
    }
  } catch {
    // AAAA records not found
  }

  try {
    const mxRecords = await resolveMx(hostname);
    if (mxRecords.length > 0) {
      dnsData.mxRecords = mxRecords;
    }
  } catch {
    // MX records not found
  }

  try {
    const txtRecords = await resolveTxt(hostname);
    if (txtRecords.length > 0) {
      dnsData.txtRecords = txtRecords.map((record) => record.join(""));
    }
  } catch {
    // TXT records not found
  }

  try {
    const nsRecords = await resolveNs(hostname);
    if (nsRecords.length > 0) {
      dnsData.nsRecords = nsRecords;
    }
  } catch {
    // NS records not found
  }

  try {
    const cnameRecords = await resolveCname(hostname);
    if (cnameRecords.length > 0) {
      dnsData.cnameRecord = cnameRecords[0];
    }
  } catch {
    // CNAME records not found
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
  return new Promise((resolve) => {
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

    socket.on("error", () => {
      resolve(null);
    });

    socket.setTimeout(TIMEOUTS.TLS_SOCKET, () => {
      socket.destroy();
      resolve(null);
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
