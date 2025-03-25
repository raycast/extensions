import { LaunchProps, List, useNavigation } from "@raycast/api";
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
import { useEffect } from "react";
import { SecurityTxt } from "./SecurityTxt";

export default function OsintWebCheck({
  arguments: { url: consumerUrl },
}: LaunchProps<{ arguments: { url: string } }>) {
  const url = addHttps(consumerUrl);

  return <CheckDetails url={url} />;
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

  const { isLoading, data } = useSWR(["validate-url", url], ([, url]) => Promise.all([checkUrl(url), wait(300)]));
  const isUrlValid = data?.[0];

  const navigation = useNavigation();
  useEffect(() => {
    if (!isLoading && !isUrlValid) {
      navigation.pop();
      navigation.push(
        <UrlInput
          initialUrl={url}
          onSubmit={(url) => {
            navigation.push(<CheckDetails url={url} />);
          }}
        />,
      );
    }
  }, [isLoading, isUrlValid, navigation]);

  const sharedProps = { url, enabled: !!isUrlValid };

  return (
    <List isShowingDetail navigationTitle={`Web Check for ${hostname}`}>
      <UrlIp {...sharedProps} />
      <WhoIs {...sharedProps} />
      <Headers {...sharedProps} />
      <SSLCheck {...sharedProps} />
      <DnsInfo {...sharedProps} />
      <DnsSec {...sharedProps} />
      <OpenPorts {...sharedProps} />
      <CrawlRules {...sharedProps} />
      <Hsts {...sharedProps} />
      <Redirects {...sharedProps} />
      <Firewall {...sharedProps} />
      <SecurityTxt {...sharedProps} />
    </List>
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
