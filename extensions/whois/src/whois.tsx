import type { LaunchProps } from "@raycast/api";
import { Detail } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import useDomainOrIp from "@/hooks/use-domain-or-ip";
import useWhoisData from "@/hooks/use-whois-data";

interface QueryProps {
  input: string;
}

const WHOIS = (props: LaunchProps<{ arguments: QueryProps }>) => {
  const input = props.arguments.input; // Get the input directly from props

  const { data: domainOrIp, isLoading: domainLoading } = useDomainOrIp(input);
  const { data: whoisData, isLoading: whoisLoading } = useWhoisData(domainOrIp, domainOrIp !== null);

  if (!domainLoading && !domainOrIp) {
    return <Detail markdown={`Cannot find domain`} />;
  }

  if (domainOrIp && !domainOrIp.isIp && !domainOrIp.isDomain && !domainLoading && !whoisLoading) {
    showFailureToast("Invalid input", {
      title: "Invalid input",
      message: "Please enter a valid domain or IP address.",
    });
    return <Detail markdown={`Invalid input`} />;
  }

  return <Detail markdown={whoisData} isLoading={domainLoading || whoisLoading} />;
};

export default WHOIS;
