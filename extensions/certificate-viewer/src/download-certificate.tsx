import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import * as tls from "tls";
import { CertificateView } from "./views/CertificateView";

export default function Command() {
  const [certificate, setCertificate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCertificateChain, setShowCertificateChain] = useState(true);
  const handleSubmit = async (values: { url: string }) => {
    setCertificate(null);
    setIsLoading(true);

    try {
      const url = values.url.trim();
      if (!url) {
        showToast({
          style: Toast.Style.Failure,
          title: "Please enter a URL",
        });
        return;
      }

      let formattedUrl = url;
      if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const parsedUrl = new URL(formattedUrl);
      const options = {
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 443,
        servername: parsedUrl.hostname,
        rejectUnauthorized: false,
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(showCertificateChain);
        if (cert) {
          if (showCertificateChain && "issuerCertificate" in cert) {
            // Handle certificate chain
            const certChain: string[] = [];
            let currentCert: tls.DetailedPeerCertificate = cert as tls.DetailedPeerCertificate;

            while (currentCert && currentCert.raw) {
              const pem = `-----BEGIN CERTIFICATE-----\n${currentCert.raw.toString("base64")}\n-----END CERTIFICATE-----`;
              certChain.push(pem);
              currentCert = currentCert.issuerCertificate;
              // Avoid infinite loops by checking if we've reached self-signed root
              if (
                currentCert === cert ||
                (currentCert && currentCert.fingerprint === currentCert.issuerCertificate?.fingerprint)
              ) {
                break;
              }
            }

            setCertificate(certChain.join("\n\n"));
          } else {
            // Handle single certificate
            const raw = cert.raw;
            const pem = `-----BEGIN CERTIFICATE-----\n${raw.toString("base64")}\n-----END CERTIFICATE-----`;
            setCertificate(pem);
          }
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to retrieve certificate",
          });
        }
        socket.end();
      });

      socket.on("error", (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: `Connection Error: ${err.message}`,
        });
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {certificate && (
            <>
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={certificate}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.Push
                icon={Icon.BulletPoints}
                title="Show Certificate"
                target={<CertificateView certText={certificate} />}
              />
            </>
          )}
          <Action.SubmitForm icon={Icon.Download} title="Download Certificate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter URL (e.g., github.com)" />
      <Form.Checkbox
        id="showCertificateChain"
        label="Show Certificate Chain"
        value={showCertificateChain}
        onChange={setShowCertificateChain}
      />
      {certificate && <Form.TextArea id="certificate" title="Certificate" value={certificate} />}
    </Form>
  );
}
