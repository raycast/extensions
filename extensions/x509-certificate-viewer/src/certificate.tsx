import { Form, ActionPanel, Action, showToast, Toast, Detail } from "@raycast/api";
import React, { useState } from "react";
import * as x509 from "@peculiar/x509";

interface Certificate {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  publicKeyType: string;
  publicKeySize?: number;
  signatureAlgorithm: string;
  publicKey: string;
  signature: string;
}

export default function Command() {
  const [certDetails, setCertDetails] = useState<Certificate | null>(null);

  function parseCertificate(pemString: string) {
    try {
      const cert = new x509.X509Certificate(pemString);
      console.log(cert.signatureAlgorithm);
      const details: Certificate = {
        subject: formatDN(cert.subject),
        issuer: formatDN(cert.issuer),
        validFrom: cert.notBefore.toLocaleString(),
        validTo: cert.notAfter.toLocaleString(),
        serialNumber: stringToHex(cert.serialNumber),
        publicKeyType: cert.publicKey.algorithm.name.toString().toUpperCase(),
        signatureAlgorithm: cert.signatureAlgorithm.hash.name.toString().toUpperCase(),
        publicKey: cert.publicKey.toString(),
        signature: formatHex(cert.signature),
      };
      setCertDetails(details);
    } catch (error) {
      console.error("Certificate parsing error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Parse Failed",
        message: "Failed to parse certificate. Invalid format or corrupted certificate",
      });
    }
  }

  function formatDN(dn: string): string {
    return dn
      .split(", ")
      .map((pair) => {
        const [key, value] = pair.split("=");
        const keyMap: { [key: string]: string } = {
          CN: "Common Name",
          O: "Organization",
          OU: "Organizational Unit",
          L: "Locality",
          ST: "State/Province",
          C: "Country",
          E: "Email",
        };
        return `${keyMap[key] || key}: ${value}`;
      })
      .join("\n");
  }

  function formatHex(hex: ArrayBuffer): string {
    return Array.from(new Uint8Array(hex))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(":")
      .toUpperCase();
  }

  function stringToHex(str: string): string {
    return (
      str
        .match(/.{1,2}/g)
        ?.join(":")
        .toUpperCase() ?? ""
    );
  }

  if (certDetails) {
    const markdown = `
# 📜 Certificate Details

## 👤 Subject
\`\`\`
${certDetails.subject}
\`\`\`

## 🏢 Issuer
\`\`\`
${certDetails.issuer}
\`\`\`

## ⏱️ Validity Period
- **Not Before**: \`${certDetails.validFrom}\`
- **Not After**: \`${certDetails.validTo}\`

## 🔑 Public Key Info
\`\`\`
${certDetails.publicKey}
\`\`\`
- **Algorithm**: \`${certDetails.publicKeyType}\`
${certDetails.publicKeySize ? `- **Key Size**: \`${certDetails.publicKeySize} bits\`` : ""}

## 📝 Signature
Algorithm: \`${certDetails.signatureAlgorithm}\`

Signature:
\`\`\`
${certDetails.signature}
\`\`\`

## 🔢 Serial Number
\`${certDetails.serialNumber}\`
`;

    return <Detail markdown={markdown} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Certificate" onSubmit={(values) => parseCertificate(values.certificate)} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="certificate"
        title="PEM Certificate"
        placeholder="Paste your PEM certificate content here..."
      />
    </Form>
  );
}
