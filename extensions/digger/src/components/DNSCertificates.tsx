import { List, Icon, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { DiggerResult } from "../types";
import { Actions } from "../actions";
import { CertificateInfo } from "../utils/dnsUtils";
import { truncateText } from "../utils/formatters";

interface DNSCertificatesProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  certificateInfo?: CertificateInfo | null;
  progress: number;
}

export function DNSCertificates({ data, onRefresh, certificateInfo, progress }: DNSCertificatesProps) {
  if (!data) {
    return (
      <List.Item
        title="DNS & Certificates"
        icon={progress < 1 ? getProgressIcon(progress, Color.Blue) : Icon.Lock}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Querying DNS..." />
                <List.Item.Detail.Metadata.Label title="" text="Looking up DNS records and TLS certificate" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const { dns } = data;

  return (
    <List.Item
      title="DNS & Certificates"
      icon={Icon.Lock}
      detail={<DNSCertificatesDetail dns={dns} certificateInfo={certificateInfo} />}
      actions={<Actions data={data} url={data.url} onRefresh={onRefresh} />}
    />
  );
}

interface DNSCertificatesDetailProps {
  dns: DiggerResult["dns"];
  certificateInfo?: CertificateInfo | null;
}

function DNSCertificatesDetail({ dns, certificateInfo }: DNSCertificatesDetailProps) {
  const getCertIcon = (daysUntilExpiry?: number) => {
    if (daysUntilExpiry === undefined) return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    if (daysUntilExpiry < 0) return { source: Icon.Xmark, tintColor: Color.Red };
    if (daysUntilExpiry < 30) return { source: Icon.Warning, tintColor: Color.Yellow };
    return { source: Icon.Check, tintColor: Color.Green };
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="DNS Records" />

          <List.Item.Detail.Metadata.Label
            title="A Records (IPv4)"
            text={dns?.aRecords?.length ? dns.aRecords.slice(0, 3).join(", ") : "No IPv4 addresses found"}
            icon={
              dns?.aRecords?.length
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />

          <List.Item.Detail.Metadata.Label
            title="AAAA Records (IPv6)"
            text={dns?.aaaaRecords?.length ? dns.aaaaRecords.slice(0, 2).join(", ") : "No IPv6 addresses found"}
            icon={
              dns?.aaaaRecords?.length
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />

          <List.Item.Detail.Metadata.Label title="CNAME" text={dns?.cnameRecord || "No CNAME record"} />

          <List.Item.Detail.Metadata.Label
            title="MX Records"
            text={
              dns?.mxRecords?.length
                ? `${dns.mxRecords.length} ${dns.mxRecords.length === 1 ? "record" : "records"}`
                : "No mail servers found"
            }
          />

          <List.Item.Detail.Metadata.Label
            title="NS Records"
            text={dns?.nsRecords?.length ? dns.nsRecords.slice(0, 2).join(", ") : "No nameservers found"}
          />

          <List.Item.Detail.Metadata.Label
            title="TXT Records"
            text={
              dns?.txtRecords?.length
                ? `${dns.txtRecords.length} ${dns.txtRecords.length === 1 ? "record" : "records"}`
                : "No TXT records found"
            }
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="TLS Certificate" />

          {certificateInfo ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={
                  certificateInfo.daysUntilExpiry !== undefined
                    ? certificateInfo.daysUntilExpiry < 0
                      ? "EXPIRED"
                      : certificateInfo.daysUntilExpiry < 30
                        ? "Expiring Soon"
                        : "Valid"
                    : "Unknown"
                }
                icon={getCertIcon(certificateInfo.daysUntilExpiry)}
              />
              <List.Item.Detail.Metadata.Label
                title="Subject"
                text={certificateInfo.subject ? truncateText(certificateInfo.subject, 50) : "N/A"}
              />
              <List.Item.Detail.Metadata.Label
                title="Issuer"
                text={certificateInfo.issuer ? truncateText(certificateInfo.issuer, 50) : "N/A"}
              />
              <List.Item.Detail.Metadata.Label title="Valid From" text={certificateInfo.validFrom || "N/A"} />
              <List.Item.Detail.Metadata.Label title="Valid To" text={certificateInfo.validTo || "N/A"} />
              {certificateInfo.daysUntilExpiry !== undefined && (
                <List.Item.Detail.Metadata.Label
                  title="Days Until Expiry"
                  text={String(certificateInfo.daysUntilExpiry)}
                />
              )}
            </>
          ) : (
            <List.Item.Detail.Metadata.Label title="" text="Certificate information not available" />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
