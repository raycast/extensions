import { Detail, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import useDomainOrIp from "@/hooks/use-domain-or-ip";
import useWhoisData from "@/hooks/use-whois-data";

export default function Whois(props: LaunchProps<{ arguments: Arguments.Whois }>) {
  const { input } = props.arguments;

  const { data: domainOrIp, isLoading: domainLoading } = useDomainOrIp(input);
  const { data: whoisData, isLoading: whoisLoading } = useWhoisData(domainOrIp, domainOrIp !== null);

  if (!domainLoading && !domainOrIp) {
    const message =
      process.platform === "darwin"
        ? "Cannot find domain or URL from browser"
        : "No domain provided - please enter a domain or IP address";
    return (
      <Detail
        markdown={`# ${message}

${
  process.platform === "darwin"
    ? "Make sure you have a browser open with a valid URL or provide a domain/IP as input."
    : "This extension requires a domain or IP address as input on non-macOS platforms."
}`}
      />
    );
  }

  if (domainOrIp && !domainOrIp.isIp && !domainOrIp.isDomain && !domainLoading && !whoisLoading) {
    showFailureToast("Invalid input", {
      title: "Invalid input",
      message: "Please enter a valid domain or IP address.",
    });
    return (
      <Detail
        markdown={`# Invalid input

Please enter a valid domain or IP address.

Props:

${JSON.stringify(props, null, 2)}
    `}
      />
    );
  }

  return <Detail markdown={whoisData} isLoading={domainLoading || whoisLoading} />;
}
