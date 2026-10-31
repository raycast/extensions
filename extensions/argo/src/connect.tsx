import { popToRoot } from "@raycast/api";
import { DiscoverBridges } from "./discovery-ui.js";
export default function Connect() {
  return (
    <DiscoverBridges
      onConnected={() => {
        void popToRoot({ clearSearchBar: true });
      }}
    />
  );
}
