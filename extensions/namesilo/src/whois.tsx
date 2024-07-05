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

Registered: ${data.registered}

Changed: ${data.changed}

Created: ${data.created}

Expires: ${data.expires}

Registrar: ${data.registrar}`;

  return <Detail isLoading={isLoading} markdown={`Whois Info for ${domain} \n\n ----- ${dataMarkdown}`} />;
}
