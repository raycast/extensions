import * as x509 from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";

export interface ListItemData {
  key: string;
  title: string;
  subtitle: string;
  copyContent?: string;
}

export interface ListSectionData {
  key: string;
  title: string;
  subtitle?: string;
  items: ListItemData[];
}

x509.cryptoProvider.set(new Crypto());

function toHexWithColons(content: ArrayBuffer | string): string {
  const hex = typeof content === "string" ? content : Buffer.from(content).toString("hex");
  return hex.match(/.{1,2}/g)?.join(":") || "";
}

function isRsaKeyAlgorithm(algo: Algorithm): algo is RsaKeyAlgorithm {
  return algo.name.toUpperCase().startsWith("RSA");
}

function isEcKeyAlgorithm(algo: Algorithm): algo is EcKeyAlgorithm {
  return algo.name.toUpperCase().startsWith("EC");
}

export function getExtensionFriendlyName(ext: x509.Extension): string | null {
  if (ext instanceof x509.BasicConstraintsExtension) return "Basic Constraints";
  if (ext instanceof x509.KeyUsagesExtension) return "Key Usages";
  if (ext instanceof x509.ExtendedKeyUsageExtension) return "Extended Key Usages";
  if (ext instanceof x509.SubjectKeyIdentifierExtension) return "Subject Key Identifier";
  if (ext instanceof x509.AuthorityKeyIdentifierExtension) return "Authority Key Identifier";
  if (ext instanceof x509.SubjectAlternativeNameExtension) return "Subject Alternative Names (SAN)";
  if (ext instanceof x509.CertificatePolicyExtension) return "Certificate Policies";
  if (ext instanceof x509.CRLDistributionPointsExtension) return "CRL Distribution Points";
  if (ext instanceof x509.AuthorityInfoAccessExtension) return "Authority Information Access";
  if (ext.type === "1.3.6.1.4.1.11129.2.4.2") return "Signed Certificate Timestamp List";
  return null;
}

function parseSpecificExtensionDetails(ext: x509.Extension, baseKey: string): ListItemData[] {
  const items: ListItemData[] = [];

  const createListItem = (title: string, subtitle: string, key: string, copyContent?: string): ListItemData => ({
    title,
    subtitle,
    key,
    copyContent,
  });

  // --- Basic Constraints ---
  if (ext instanceof x509.BasicConstraintsExtension) {
    items.push(createListItem("CA", ext.ca.toString(), `${baseKey}-ca`, ext.ca.toString()));
    if (ext.pathLength !== undefined) {
      items.push(
        createListItem("Path Length", ext.pathLength.toString(), `${baseKey}-pathlength`, ext.pathLength.toString()),
      );
    }
  }
  // --- Key Usages ---
  else if (ext instanceof x509.KeyUsagesExtension) {
    const usages: string[] = [];
    if (ext.usages & x509.KeyUsageFlags.digitalSignature) usages.push("Digital Signature");
    if (ext.usages & x509.KeyUsageFlags.nonRepudiation) usages.push("Non Repudiation (Content Commitment)");
    if (ext.usages & x509.KeyUsageFlags.keyEncipherment) usages.push("Key Encipherment");
    if (ext.usages & x509.KeyUsageFlags.dataEncipherment) usages.push("Data Encipherment");
    if (ext.usages & x509.KeyUsageFlags.keyAgreement) usages.push("Key Agreement");
    if (ext.usages & x509.KeyUsageFlags.keyCertSign) usages.push("Key Cert Sign");
    if (ext.usages & x509.KeyUsageFlags.cRLSign) usages.push("CRL Sign");
    if (ext.usages & x509.KeyUsageFlags.encipherOnly) usages.push("Encipher Only");
    if (ext.usages & x509.KeyUsageFlags.decipherOnly) usages.push("Decipher Only");
    items.push(createListItem("Usages", usages.join(", ") || "None", `${baseKey}-usages`, usages.join(", ")));
    items.push(createListItem("Raw Usage Value", ext.usages.toString(), `${baseKey}-rawusages`, ext.usages.toString()));
  }
  // --- Extended Key Usages ---
  else if (ext instanceof x509.ExtendedKeyUsageExtension) {
    const ekuFriendlyNames: Record<string | x509.ExtendedKeyUsage, string> = {
      [x509.ExtendedKeyUsage.serverAuth]: "Server Authentication",
      [x509.ExtendedKeyUsage.clientAuth]: "Client Authentication",
      [x509.ExtendedKeyUsage.codeSigning]: "Code Signing",
      [x509.ExtendedKeyUsage.emailProtection]: "Email Protection",
      [x509.ExtendedKeyUsage.timeStamping]: "Time Stamping",
      [x509.ExtendedKeyUsage.ocspSigning]: "OCSP Signing",
      "1.3.6.1.5.5.7.3.5": "IP Security End System",
      "1.3.6.1.5.5.7.3.6": "IP Security Tunnel Termination",
      "1.3.6.1.5.5.7.3.7": "IP Security User",
      "2.5.29.37.0": "Any Extended Key Usage",
    };
    const usageNames = ext.usages.map((usageOid) => ekuFriendlyNames[usageOid as string] || usageOid).join(", ");
    items.push(createListItem("Usages", usageNames, `${baseKey}-ekus`, usageNames));
  }
  // --- Subject Key Identifier ---
  else if (ext instanceof x509.SubjectKeyIdentifierExtension) {
    items.push(createListItem("Key ID", toHexWithColons(ext.keyId), `${baseKey}-skid`, toHexWithColons(ext.keyId)));
  }
  // --- Authority Key Identifier ---
  else if (ext instanceof x509.AuthorityKeyIdentifierExtension) {
    if (ext.keyId) {
      items.push(
        createListItem("Key ID", toHexWithColons(ext.keyId), `${baseKey}-akid-keyid`, toHexWithColons(ext.keyId)),
      );
    }
    if (ext.certId) {
      const issuerName = (ext.certId.name as x509.GeneralNames).items.map((i) => i.value).join(", ");
      items.push(createListItem("Certificate Issuer", issuerName, `${baseKey}-akid-issuer`, issuerName));
      items.push(
        createListItem(
          "Certificate Serial",
          ext.certId.serialNumber,
          `${baseKey}-akid-serial`,
          ext.certId.serialNumber,
        ),
      );
    }
  }
  // --- Subject Alternative Names (SAN) ---
  else if (ext instanceof x509.SubjectAlternativeNameExtension) {
    ext.names.items.forEach((name, index) => {
      items.push(
        createListItem(
          `SAN ${index + 1}`,
          `${name.type}: ${name.value}`,
          `${baseKey}-san-${index}`,
          `${name.type}: ${name.value}`,
        ),
      );
    });
  }
  // --- Certificate Policies ---
  else if (ext instanceof x509.CertificatePolicyExtension) {
    ext.policies.forEach((policy, index) => {
      items.push(createListItem(`Policy OID ${index + 1}`, policy, `${baseKey}-policy-${index}`, policy));
    });
  }
  // --- CRL Distribution Points ---
  else if (ext instanceof x509.CRLDistributionPointsExtension) {
    ext.distributionPoints.forEach((dpStruct, index) => {
      const dpKeyPrefix = `${baseKey}-crl-dp-${index}`;
      if (dpStruct.distributionPoint) {
        const dpName = dpStruct.distributionPoint;
        if (dpName.fullName && dpName.fullName.length > 0) {
          const names = dpName.fullName.map((gnStruct) => new x509.GeneralName(gnStruct).value).join("; ");
          items.push(createListItem(`DP FullName ${index + 1}`, names, `${dpKeyPrefix}-fullname`, names));
        }
        if (dpName.nameRelativeToCRLIssuer && dpName.nameRelativeToCRLIssuer.length > 0) {
          const relativeName = dpName.nameRelativeToCRLIssuer.map((rdn) => `${rdn.type}: ${rdn.value}`).join(", ");
          items.push(
            createListItem(`DP RelativeName ${index + 1}`, relativeName, `${dpKeyPrefix}-relname`, relativeName),
          );
        }
      }
      if (dpStruct.reasons) {
        items.push(
          createListItem(
            `DP Reasons ${index + 1}`,
            `Raw BitString (val: ${dpStruct.reasons.value}, unused: ${dpStruct.reasons.unusedBits})`,
            `${dpKeyPrefix}-reasons`,
          ),
        );
      }
      if (dpStruct.cRLIssuer && dpStruct.cRLIssuer.length > 0) {
        const issuerNames = dpStruct.cRLIssuer.map((gnStruct) => new x509.GeneralName(gnStruct).value).join("; ");
        items.push(createListItem(`DP CRL Issuer ${index + 1}`, issuerNames, `${dpKeyPrefix}-crlissuer`, issuerNames));
      }
    });
  }
  // --- Authority Information Access ---
  else if (ext instanceof x509.AuthorityInfoAccessExtension) {
    if (ext.ocsp && ext.ocsp.length > 0) {
      ext.ocsp.forEach((gn, index) => {
        items.push(
          createListItem(`OCSP URI ${index + 1}`, `${gn.type}: ${gn.value}`, `${baseKey}-aia-ocsp-${index}`, gn.value),
        );
      });
    }
    if (ext.caIssuers && ext.caIssuers.length > 0) {
      ext.caIssuers.forEach((gn, index) => {
        items.push(
          createListItem(
            `CA Issuers URI ${index + 1}`,
            `${gn.type}: ${gn.value}`,
            `${baseKey}-aia-caissuers-${index}`,
            gn.value,
          ),
        );
      });
    }
    if (ext.timeStamping && ext.timeStamping.length > 0) {
      ext.timeStamping.forEach((gn, index) => {
        items.push(
          createListItem(
            `Time Stamping URI ${index + 1}`,
            `${gn.type}: ${gn.value}`,
            `${baseKey}-aia-timestamping-${index}`,
            gn.value,
          ),
        );
      });
    }
    if (ext.caRepository && ext.caRepository.length > 0) {
      ext.caRepository.forEach((gn, index) => {
        items.push(
          createListItem(
            `CA Repository URI ${index + 1}`,
            `${gn.type}: ${gn.value}`,
            `${baseKey}-aia-carepository-${index}`,
            gn.value,
          ),
        );
      });
    }
  }
  // --- Fallback for other extensions ---
  else {
    items.push(createListItem("Not Supported Extension", "Please check the detail view", `${baseKey}-not-supported`));
  }

  return items;
}

export async function parseCertificate(cert: x509.X509Certificate): Promise<ListSectionData[]> {
  const sections: ListSectionData[] = [];

  // Calculate fingerprints
  const sha1 = Array.from(new Uint8Array(await cert.getThumbprint()), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join(":");
  const sha256 = Array.from(new Uint8Array(await cert.getThumbprint("SHA-256")), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join(":");

  // General Information
  const generalSection: ListSectionData = {
    key: "general",
    title: "✨ General Information",
    items: [
      {
        key: "general-subject",
        title: "Subject",
        subtitle: cert.subject,
        copyContent: cert.subject,
      },
      { key: "general-issuer", title: "Issuer", subtitle: cert.issuer, copyContent: cert.issuer },
      {
        key: "general-serial",
        title: "Serial Number",
        subtitle: toHexWithColons(cert.serialNumber),
        copyContent: toHexWithColons(cert.serialNumber),
      },
      {
        key: "general-notbefore",
        title: "Not Before",
        subtitle: cert.notBefore.toLocaleString(),
        copyContent: cert.notBefore.toISOString(),
      },
      {
        key: "general-notafter",
        title: "Not After",
        subtitle: cert.notAfter.toLocaleString(),
        copyContent: cert.notAfter.toISOString(),
      },
      {
        key: "general-fingerprint-sha1",
        title: "SHA-1 Fingerprint",
        subtitle: sha1,
        copyContent: sha1,
      },
      {
        key: "general-fingerprint-sha256",
        title: "SHA-256 Fingerprint",
        subtitle: sha256,
        copyContent: sha256,
      },
    ],
  };
  sections.push(generalSection);

  // Signature Information
  const signatureSection: ListSectionData = {
    key: "signature",
    title: "🖊️ Signature Information",
    items: [
      {
        key: "general-sigalgo",
        title: "Signature Algorithm",
        subtitle: `${cert.signatureAlgorithm.name} (Hash: ${cert.signatureAlgorithm.hash.name})`,
        copyContent: `${cert.signatureAlgorithm.name} (Hash: ${cert.signatureAlgorithm.hash.name})`,
      },
      {
        key: "general-sigvalue",
        title: "Signature Value",
        subtitle: toHexWithColons(cert.signature),
        copyContent: toHexWithColons(cert.signature),
      },
    ],
  };
  sections.push(signatureSection);

  // Public Key Information
  const pkAlgo = cert.publicKey.algorithm;
  const pkItems: ListItemData[] = [
    {
      key: "pubkey-algo",
      title: "Public Key Algorithm",
      subtitle: cert.publicKey.algorithm.name,
      copyContent: cert.publicKey.algorithm.name,
    },
  ];

  if (isRsaKeyAlgorithm(pkAlgo)) {
    pkItems.push({
      key: "pubkey-detail-modulus-length",
      title: "Modulus Length",
      subtitle: pkAlgo.modulusLength.toString(),
      copyContent: pkAlgo.modulusLength.toString(),
    });
    if (pkAlgo.publicExponent) {
      const exp = parseInt(Buffer.from(pkAlgo.publicExponent).toString("hex"), 16);
      const expHex = Buffer.from(pkAlgo.publicExponent).toString("hex");
      pkItems.push({
        key: "pubkey-detail-public-exponent",
        title: "Public Exponent",
        subtitle: `${exp} (0x${expHex})`,
        copyContent: `${exp} (0x${expHex})`,
      });
    }
  } else if (isEcKeyAlgorithm(pkAlgo)) {
    pkItems.push({
      key: "pubkey-detail-named-curve",
      title: "Named Curve",
      subtitle: pkAlgo.namedCurve,
      copyContent: pkAlgo.namedCurve,
    });
  }

  pkItems.push({
    key: "pubkey-raw",
    title: "Public Key",
    subtitle: toHexWithColons(cert.publicKey.rawData),
    copyContent: toHexWithColons(cert.publicKey.rawData),
  });

  const publicKeySection: ListSectionData = {
    key: "pubkey",
    title: "🔑 Public Key Information",
    items: pkItems,
  };
  sections.push(publicKeySection);

  // Extensions
  if (cert.extensions && cert.extensions.length > 0) {
    cert.extensions.forEach((ext) => {
      const _name = getExtensionFriendlyName(ext);
      const name = _name ? `${_name} (${ext.type})` : ext.type;
      const subtitle = `Critical: ${ext.critical}`;
      const extensionSection: ListSectionData = {
        key: `section-${ext.type}`,
        title: `📜 Extension: ${name}`,
        subtitle: subtitle,
        items: parseSpecificExtensionDetails(ext, `ext-${ext.type}`),
      };
      sections.push(extensionSection);
    });
  } else {
    sections.push({
      key: "no-extensions",
      title: "📜 X.509 v3 Extensions",
      items: [{ key: "no-ext", title: "No extensions found", subtitle: "" }],
    });
  }

  return sections;
}
