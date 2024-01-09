import { List, useNavigation } from "@raycast/api";
import { UrlInput } from "./UrlInput";
import { UrlIp } from "./UrlIp";
import { SSLCheck } from "./SSLCheck";
import { Headers } from "./Headers";
import { DnsInfo } from "./DnsInfo";
import { OpenPorts } from "./OpenPorts";
import { DnsSec } from "./DnsSec";
import { CrawlRules } from "./CrawlRules";
import { Hsts } from "./Hsts";
import { Redirects } from "./Redirects";
import { Firewall } from "./Firewall";
import { WhoIs } from "./WhoIs";

export default function OsintWebCheck() {
  const navigation = useNavigation();

  return (
    <UrlInput
      onSubmit={(url) => {
        navigation.push(<CheckDetails url={url} />);
      }}
    />
  );
}

function CheckDetails({ url }: { url: string }) {
  // safely parse out just hostname, fallback to full url in the unexpected case of URL construction failure
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <List isShowingDetail navigationTitle={`Web Check for ${hostname}`}>
      <UrlIp url={url} />
      <WhoIs url={url} />
      <Headers url={url} />
      <SSLCheck url={url} />
      <DnsInfo url={url} />
      <DnsSec url={url} />
      <OpenPorts url={url} />
      <CrawlRules url={url} />
      <Hsts url={url} />
      <Redirects url={url} />
      <Firewall url={url} />
    </List>
  );
}
