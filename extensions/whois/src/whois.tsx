import { Detail, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import useDomainOrIp from "@/hooks/use-domain-or-ip";
import useWhoisData from "@/hooks/use-whois-data";

export default function Whois(props: LaunchProps<{ arguments: Arguments.Whois }>) {
  const { input } = props.arguments;

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
}
