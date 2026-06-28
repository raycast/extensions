import { Color, Icon, List } from "@raycast/api";
import { IpDetails } from "./components/ip-details";
import { useIpInfo } from "./hooks/use-ip-info";

export default function Command() {
  const { isLoading, ipInfo, errorText } = useIpInfo();

  if (errorText) {
    return (
      <List>
        <List.EmptyView
          title={"An error occurred"}
          description={errorText}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      </List>
    );
  }

  return <IpDetails ipInfo={ipInfo} isLoading={isLoading} />;
}
