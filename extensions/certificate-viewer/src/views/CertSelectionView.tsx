import { List, ActionPanel, Action, Icon } from "@raycast/api";
import * as x509 from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";
import { CertListView } from "./CertListView";

x509.cryptoProvider.set(new Crypto());

interface CertSelectionViewProps {
  certificates: string[];
}

export function CertSelectionView({ certificates }: CertSelectionViewProps) {
  const getCertificateInfo = (certPem: string, index: number) => {
    try {
      const cert = new x509.X509Certificate(certPem);
      return {
        title: `Certificate ${index + 1}`,
        subtitle: cert.subject,
        accessories: [{ text: `Expires: ${cert.notAfter.toLocaleDateString()}` }],
      };
    } catch {
      return {
        title: `Certificate ${index + 1}`,
        subtitle: "Failed to parse certificate",
        accessories: [{ text: "Error", icon: Icon.ExclamationMark }],
      };
    }
  };

  return (
    <List navigationTitle="Select Certificate">
      {certificates.map((certPem, index) => {
        const info = getCertificateInfo(certPem, index);
        return (
          <List.Item
            key={index}
            title={info.title}
            subtitle={info.subtitle}
            accessories={info.accessories}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Eye} title="View Certificate" target={<CertListView certText={certPem} />} />
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={certPem}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
