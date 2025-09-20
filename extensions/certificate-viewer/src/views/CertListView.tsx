import * as x509 from "@peculiar/x509";
import { useEffect, useState } from "react";
import { ListSectionData, parseCertificate } from "../utils/certificate-parser";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import CertDetailView from "./CertDetailView";
import { cleanPemInput } from "../utils/x509utils";
import { showFailureToast } from "@raycast/utils";

export function CertListView({ certText }: { certText: string }) {
  const [sections, setSections] = useState<ListSectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function parseCert() {
      if (certText) {
        const cert = new x509.X509Certificate(cleanPemInput(certText));
        const parsedSections = await parseCertificate(cert);
        setSections(parsedSections);
      } else {
        setSections([]);
      }
    }
    parseCert()
      .catch((error) => {
        showFailureToast(error, {
          title: "Error parsing certificate: Must be one of DER, PEM, HEX, Base64, or Base64Url",
        });
        setSections([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [certText]);

  return (
    <List isLoading={isLoading}>
      {sections.map((section) => (
        <List.Section key={section.key} title={section.title} subtitle={section.subtitle}>
          {section.items.map((item) => (
            <List.Item
              key={item.key}
              title={item.title}
              subtitle={item.subtitle}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard title={`Copy ${item.title}`} content={item.copyContent ?? item.subtitle} />
                    <Action.Push
                      icon={Icon.Plus}
                      title="Show Details"
                      target={<CertDetailView certificate={certText} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
