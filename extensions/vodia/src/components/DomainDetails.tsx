import { Detail } from "@raycast/api";
import { DomainListItem } from "./DomainCommandList";

export function DomainDetails({ domain }: { domain: DomainListItem }) {
  return <Detail markdown={`# ${domain.display}\n\n**Domain Name:** ${domain.name}`} />;
}
