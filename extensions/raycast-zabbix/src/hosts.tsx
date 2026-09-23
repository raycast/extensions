import * as React from "react";
import { HostsView } from "@ui/HostsView/main";

process.env.NODE_EXTRA_CA_CERTS = process.env.NODE_EXTRA_CA_CERTS || "";

export default function Command(): React.JSX.Element {
  return <HostsView />;
}
