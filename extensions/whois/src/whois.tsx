import { Detail, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import useDomainOrIp from "@/hooks/use-domain-or-ip";
import useDomainWhois from "@/hooks/use-domain-whois";
import useWhoisData from "@/hooks/use-whois-data";
import { DomainDetail } from "@/components/DomainDetail";

export default function Whois(props: LaunchProps<{ arguments: Arguments.Whois }>) {
  const { input } = props.arguments;

  const { data: domainOrIp, isLoading: domainLoading } = useDomainOrIp(input);

  const isDomain = !domainLoading && !!domainOrIp?.isDomain;
  const isIp = !domainLoading && !!domainOrIp?.isIp;

  // For IPs: ip-api.com lookup
  const { data: ipWhoisData, isLoading: ipWhoisLoading } = useWhoisData(domainOrIp, isIp);

  // For domains: new flow using whoiser + RDAP
  const { data: domainWhoisData, isLoading: domainWhoisLoading } = useDomainWhois(domainOrIp?.input ?? "", isDomain);

  // No valid input resolved yet (AppleScript failed or no input provided)
  if (!domainLoading && (!domainOrIp || !domainOrIp.input)) {
    const message =
      process.platform === "darwin"
        ? "Cannot find domain or URL from browser"
        : "No domain provided - please enter a domain or IP address";
    return (
      <Detail
        markdown={`# ${message}\n\n${
          process.platform === "darwin"
            ? "Make sure you have a browser open with a valid URL or provide a domain/IP as input."
            : "This extension requires a domain or IP address as input on non-macOS platforms."
        }`}
      />
    );
  }

  // Invalid input (not a domain, not an IP)
  if (domainOrIp && !domainOrIp.isIp && !domainOrIp.isDomain && !domainLoading) {
    showFailureToast("Invalid input", {
      title: "Invalid input",
      message: "Please enter a valid domain or IP address.",
    });
    return (
      <Detail
        markdown={`# Invalid input\n\nPlease enter a valid domain or IP address.\n\n\`\`\`\n${JSON.stringify(props, null, 2)}\n\`\`\``}
      />
    );
  }

  // Domain → structured Detail with Metadata
  if (isDomain || (domainOrIp?.isDomain && domainLoading)) {
    return (
      <DomainDetail
        domain={domainOrIp?.input ?? input ?? ""}
        data={domainWhoisData}
        isLoading={domainLoading || domainWhoisLoading}
      />
    );
  }

  // IP → existing plain markdown view
  return <Detail markdown={ipWhoisData} isLoading={domainLoading || ipWhoisLoading} />;
}
