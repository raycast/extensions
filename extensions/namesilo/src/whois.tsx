import { Detail, LaunchProps } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { WhoisInfo } from "./lib/types";

export default function Whois(props: LaunchProps<{ arguments: Arguments.Whois }>) {
  const { domain } = props.arguments;
  const { isLoading, data } = useNameSilo<WhoisInfo>("whoisInfo", {
    domain,
  });

  const dataMarkdown = !data
    ? ""
    : `
Domain: ${data.domain}

Registered: ${data.registered || (!isLoading ? "N/A" : "...")}

Changed: ${data.changed || (!isLoading ? "N/A" : "...")}

Created: ${data.created || (!isLoading ? "N/A" : "...")}

Expires: ${data.expires || (!isLoading ? "N/A" : "...")}

Registrar: ${data.registrar || (!isLoading ? "N/A" : "...")}`;

  return <Detail isLoading={isLoading} markdown={`WHOIS Info for ${domain} \n\n ----- ${dataMarkdown}`} />;
}
