import { List, useNavigation } from "@raycast/api";
import { UrlInput } from "./UrlInput";
import { UrlIp } from "./UrlIp";
import { SSLCheck } from "./SSLCheck";
import { Headers } from "./Headers";
import { DnsInfo } from "./DnsInfo";
import { OpenPorts } from "./OpenPorts";
import { DnsSec } from "./DnsSec";
import { TxtRecords } from "./TxtRecords";

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
  return (
    <List isShowingDetail>
      <UrlIp url={url} />
      <Headers url={url} />
      <SSLCheck url={url} />
      <DnsInfo url={url} />
      <TxtRecords url={url} />
      <DnsSec url={url} />
      {/*<WhoIs url={url} />*/}
      <OpenPorts url={url} />
    </List>
  );
}
