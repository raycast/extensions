import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import Track from "./Track";
import { getVendors } from "../../api/api";
import { IVendorData } from "../../model/vendorData";

interface State {
  loading: boolean;
  vendors: IVendorData[];
}

export default function TrackMain() {
  const [state, setState] = useState<State>({ loading: true, vendors: [] });

  useEffect(() => {
    (async () => {
      try {
        const { data: vendors } = await getVendors();
        setState({ loading: false, vendors });
      } catch (e) {
        setState((previous) => ({ ...previous, loading: false }));
      }
    })();
  }, []);

  return (
    <List isLoading={state.loading} searchBarPlaceholder="Choose delivery vendor">
      {state.vendors.map((vendor) => (
        <List.Item
          key={vendor.code}
          icon={Icon.Circle}
          title={vendor.name}
          actions={
            <ActionPanel>
              <Action.Push title="Next" target={<Track vendorKey={vendor.code} vendorName={vendor.name} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
