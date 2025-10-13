import { Color, Icon, LaunchProps, List } from "@raycast/api";
import { useIpInfo } from "./hooks/use-ip-info";
import { IpDetails } from "./components/ip-details";

interface CommandArguments {
  ipAddress: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { ipAddress } = props.arguments;
  const { isLoading, ipInfo, errorText } = useIpInfo(ipAddress);

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
