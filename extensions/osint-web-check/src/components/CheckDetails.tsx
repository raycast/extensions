/**
 * CheckDetails
 *
 * Extracted from the original inline `CheckDetails` in `osint-web-check.tsx`.
 * Renders the 12 per-section web-check rows (URL/IP, WHOIS, Headers, SSL,
 * DNS, DNSSEC, Open Ports, Crawl Rules, HSTS, Redirects, Firewall,
 * security.txt) as the body of a `<List.Item.Detail>` metadata block.
 *
 * Used by the unified OSINT Web Check command as the body of the single
 * "Web Check" row. Validates the URL via a DNS lookup; pushes a `<UrlInput>`
 * fallback form when the host does not resolve.
 */

import { List, useNavigation } from "@raycast/api";
import useSWR from "swr";
import { useEffect } from "react";
import { UrlInput } from "../UrlInput";
import { UrlIp } from "../UrlIp";
import { WhoIs } from "../WhoIs";
import { Headers } from "../Headers";
import { SSLCheck } from "../SSLCheck";
import { DnsInfo } from "../DnsInfo";
import { DnsSec } from "../DnsSec";
import { OpenPorts } from "../OpenPorts";
import { CrawlRules } from "../CrawlRules";
import { Hsts } from "../Hsts";
import { Redirects } from "../Redirects";
import { Firewall } from "../Firewall";
import { SecurityTxt } from "../SecurityTxt";
import { checkUrl } from "../utils/checkUrl";

export interface CheckDetailsProps {
  url: string;
  enabled: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function CheckDetails({ url, enabled }: CheckDetailsProps) {
  // safely parse out just hostname, fallback to full url in the unexpected case of URL construction failure
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  const { isLoading, data } = useSWR(enabled ? ["validate-url", url] : null, ([, u]) =>
    Promise.all([checkUrl(u), wait(300)]),
  );
  const isUrlValid = data?.[0];

  const navigation = useNavigation();
  useEffect(() => {
    if (enabled && !isLoading && !isUrlValid) {
      navigation.pop();
      navigation.push(
        <UrlInput
          initialUrl={url}
          onSubmit={(nextUrl) => {
            navigation.push(<CheckDetails url={nextUrl} enabled />);
          }}
        />,
      );
    }
  }, [enabled, isLoading, isUrlValid, navigation, url]);

  const sharedProps = { url, enabled: enabled && !!isUrlValid };

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
