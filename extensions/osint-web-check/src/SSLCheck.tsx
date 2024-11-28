import { connect, type PeerCertificate } from "node:tls";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { Fragment } from "react";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function SSLCheck({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "ssl-check", url, enabled, fetcher: getSSLInformation });

  const extKeyUsage = data?.ext_key_usage?.map((oid) => OID_MAP[oid]) ?? [];

  const items: [string, string][] = data
    ? [
        ["Subject", data.subject.CN],
        ["Issuer", data.issuer.O],
        ["Expires", data.valid_to],
        ["Renews", data.valid_from],
        ["Serial Number", data.serialNumber],
        ["Fingerprint (SHA256)", data.fingerprint256],
        ["Fingerprint (SHA512)", data.fingerprint512],
      ]
    : [];

  return (
    <List.Item
      title="SSL Certificate"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
          {items.map(([key, value]) => (
            <Action.CopyToClipboard key={key} title={`Copy ${key} To Clipboard`} content={value} />
          ))}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                {items.map(([key, value]) => (
                  <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                ))}
                {extKeyUsage.length > 0 && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Extended Key Usage">
                      {extKeyUsage.map((item) => (
                        <List.Item.Detail.Metadata.TagList.Item key={item} text={item} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </Fragment>
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

async function getSSLInformation(url: string) {
  return new Promise<PeerCertificate>((resolve, reject) => {
    const host = new URL(url).host;
    const socket = connect({ host, servername: host, port: 443 });
    socket.setTimeout(1500);

    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      resolve(cert);
    });

    const noGood = () => {
      socket.destroy();
      reject("Nope");
    };
    socket.once("close", noGood);
    socket.once("error", noGood);
    socket.once("timeout", noGood);
  });
}

const OID_MAP: { [key: string]: string } = {
  "1.3.6.1.5.5.7.3.1": "TLS Web Server Authentication",
  "1.3.6.1.5.5.7.3.2": "TLS Web Client Authentication",
  "1.3.6.1.5.5.7.3.3": "Code Signing",
  "1.3.6.1.5.5.7.3.4": "Email Protection (SMIME)",
  "1.3.6.1.5.5.7.3.8": "Time Stamping",
  "1.3.6.1.5.5.7.3.9": "OCSP Signing",
  "1.3.6.1.5.5.7.3.5": "IPSec End System",
  "1.3.6.1.5.5.7.3.6": "IPSec Tunnel",
  "1.3.6.1.5.5.7.3.7": "IPSec User",
  "1.3.6.1.5.5.8.2.2": "IKE Intermediate",
  "2.16.840.1.113730.4.1": "Netscape Server Gated Crypto",
  "1.3.6.1.4.1.311.10.3.3": "Microsoft Server Gated Crypto",
  "1.3.6.1.4.1.311.10.3.4": "Microsoft Encrypted File System",
  "1.3.6.1.4.1.311.20.2.2": "Microsoft Smartcard Logon",
  "1.3.6.1.4.1.311.10.3.12": "Microsoft Document Signing",
  "0.9.2342.19200300.100.1.3": "Email Address (in Subject Alternative Name)",
};

const INFO = `
## SSL Certificates

SSL certificates are cryptographic credentials that ensure secure communication between a website and its users by encrypting data transmissions. They validate and authenticate the identity of a website, providing a trust indicator to users that their information is protected.

SSL certificate information can be used for OSINT by identifying legitimate websites, gathering metadata about security practices, monitoring certificate changes through Certificate Transparency logs, uncovering domain connections, and investigating phishing attacks. It provides valuable insights into websites' authenticity, infrastructure, and potential malicious activities when combined with other OSINT techniques.
...
`.trim();
