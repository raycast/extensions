import { List } from "@raycast/api";
import { VPNConnection } from "../scutil";
import VPN from "./item";

export interface ListProps {
  isLoading: boolean;
  vpns: VPNConnection[];
  onAction: () => void;
}

export function VPNList(props: ListProps): JSX.Element {
  return (
    <List isLoading={props.isLoading}>
      <List.Section title="VPNs">
        {props.vpns.map((vpn) => (
          <VPN onAction={props.onAction} key={`vpn-${vpn.name}`} vpn={vpn} />
        ))}
      </List.Section>
    </List>
  );
}
