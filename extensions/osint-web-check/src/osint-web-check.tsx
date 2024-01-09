import { Detail, LaunchProps, List, useNavigation } from "@raycast/api";
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
import useSWR from "swr";
import { checkUrl } from "./utils/checkUrl";
import { addHttps } from "./utils/addHttps";

export default function OsintWebCheck({
  arguments: { url: consumerUrl },
}: LaunchProps<{ arguments: { url: string } }>) {
  const url = addHttps(consumerUrl);
  // Artificially throttle so UI isn't jarring
  const { isLoading, data } = useSWR(["validate-url", url], ([, url]) => Promise.all([checkUrl(url), wait(300)]));
  const isUrlValid = data?.[0];

  const navigation = useNavigation();

  if (isLoading) {
    return <Detail markdown={`## Validating ${url}...`} isLoading={true} />;
  }

  if (isUrlValid) {
    return <CheckDetails url={url} />;
  }

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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
