import { List } from "@raycast/api";
import { getCertificateHealth } from "../api";
import { EmptyView } from "../components/empty-view";
import { CertificateCheck, Site } from "../interface";
import { camelCaseToWords } from "../utils/camel-case";

export default function CertificateHealthCommand({ item }: { item: Site }): JSX.Element {
  const { data, isLoading } = getCertificateHealth(item);

  return (
    <List navigationTitle={`Certificate Health for ${item.label}`} isLoading={isLoading} isShowingDetail>
      <EmptyView title={!data?.certificate_details ? "No Results Found" : "No Certificate Health Available"} />
      <List.Item
        key="certificate_details"
        title="Certificate Details"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Issuer" text={data?.certificate_details.issuer} />
                <List.Item.Detail.Metadata.Label title="Valid from" text={data?.certificate_details.valid_from} />
                <List.Item.Detail.Metadata.Label title="Valid until" text={data?.certificate_details.valid_until} />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
      <List.Item
        key="certificate_checks"
        title="Certificate Checks"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {data?.certificate_checks.map((check: CertificateCheck, index: number) => (
                  <List.Item.Detail.Metadata.Label
                    key={index}
                    title={camelCaseToWords(check.type)}
                    text={camelCaseToWords(check.type)}
                  />
                ))}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
      <List.Item
        key="certificate_chain_issuers"
        title="Certificate Chain Issuers"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {data?.certificate_chain_issuers.map((issuer: string, index: number) => (
                  <List.Item.Detail.Metadata.Label key={index} title={issuer} />
                ))}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
