import { Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Actions } from "../actions";
import { DiggerResult, DNSData, DNSRecordKind, ResourceStatus } from "../types";
import { CertificateInfo } from "../utils/dnsUtils";
import { truncateText } from "../utils/formatters";

interface DNSCertificatesProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  certificateInfo?: CertificateInfo | null;
  progress: number;
}

const ALL_RECORD_KINDS: DNSRecordKind[] = ["a", "aaaa", "cname", "mx", "ns", "txt"];

const countText = (n?: number) => (n ? `${n} ${n === 1 ? "record" : "records"}` : undefined);

/**
 * One DNS record row, three-valued like every other lookup in the extension.
 *
 * The empty case is NOT automatically "none published": if that record type's
 * query failed, we never learned what the host publishes, and saying "No mail
 * servers found" there states a fact we do not have. Only `unchecked` can tell
 * those apart, so the row consults it before falling back to the absent copy.
 */
function recordRow(
  title: string,
  kind: DNSRecordKind,
  dns: DNSData | undefined,
  found: string | undefined,
  absent: string,
) {
  if (found) {
    return (
      <List.Item.Detail.Metadata.Label
        title={title}
        text={found}
        icon={{ source: Icon.Check, tintColor: Color.Green }}
      />
    );
  }
  if (dns?.unchecked?.includes(kind)) {
    return (
      <List.Item.Detail.Metadata.Label
        title={title}
        text="Couldn't check"
        icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
      />
    );
  }
  return (
    <List.Item.Detail.Metadata.Label title={title} text={absent} icon={{ source: Icon.Xmark, tintColor: Color.Red }} />
  );
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
      detail={
        <DNSCertificatesDetail
          dns={dns}
          certificateInfo={certificateInfo}
          dnsStatus={data.lookups?.dns}
          certStatus={data.lookups?.certificate}
        />
      }
      actions={<Actions data={data} url={data.url} onRefresh={onRefresh} />}
    />
  );
}

interface DNSCertificatesDetailProps {
  dns: DiggerResult["dns"];
  certificateInfo?: CertificateInfo | null;
  dnsStatus?: ResourceStatus;
  certStatus?: ResourceStatus;
}

function DNSCertificatesDetail({ dns: rawDns, certificateInfo, dnsStatus, certStatus }: DNSCertificatesDetailProps) {
  // A section-level failure has to reach every ROW, not just add a line above
  // them. A failed lookup resolves with the empty fallback, and an empty record
  // set reads as "none published" — so a summary label saying "Couldn't check"
  // sat here while all six rows below it still asserted "No IPv4 addresses
  // found" and friends: exactly the absence we never established.
  const dns: DNSData | undefined = dnsStatus === "unavailable" ? { ...rawDns, unchecked: ALL_RECORD_KINDS } : rawDns;

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

          {recordRow("A Records (IPv4)", "a", dns, dns?.aRecords?.slice(0, 3).join(", "), "No IPv4 addresses found")}
          {recordRow(
            "AAAA Records (IPv6)",
            "aaaa",
            dns,
            dns?.aaaaRecords?.slice(0, 2).join(", "),
            "No IPv6 addresses found",
          )}
          {recordRow("CNAME", "cname", dns, dns?.cnameRecord, "No CNAME record")}
          {recordRow("MX Records", "mx", dns, countText(dns?.mxRecords?.length), "No mail servers found")}
          {recordRow("NS Records", "ns", dns, dns?.nsRecords?.slice(0, 2).join(", "), "No nameservers found")}
          {recordRow("TXT Records", "txt", dns, countText(dns?.txtRecords?.length), "No TXT records found")}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="TLS Certificate" />

          {certStatus === "unavailable" ? (
            <List.Item.Detail.Metadata.Label
              title="Status"
              text="Couldn't check"
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            />
          ) : certificateInfo ? (
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
