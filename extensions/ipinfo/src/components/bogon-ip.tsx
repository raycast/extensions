import { Color, Icon, List } from "@raycast/api";
import { IPBogon } from "node-ipinfo/dist/src/common";

type BogonIPProps = {
  ipInfo: IPBogon;
};

export const BogonIP = ({ ipInfo }: BogonIPProps) => {
  return (
    <List>
      <List.EmptyView
        title={ipInfo.ip}
        description="Bogon IP Address"
        icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
      />
    </List>
  );
};
