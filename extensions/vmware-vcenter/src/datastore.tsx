import { vCenter } from "./api/vCenter";
import { DatastoreSummary } from "./api/types";
import * as React from "react";
import { ActionPanel, Action, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const preferences = getPreferenceValues();
const vCenterApi = new vCenter(preferences.vcenter_fqdn, preferences.vcenter_username, preferences.vcenter_password);

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [Datastores, setNetworks]: [DatastoreSummary[], React.Dispatch<React.SetStateAction<DatastoreSummary[]>>] =
    React.useState([] as DatastoreSummary[]);

  function GetDatastoreAction(): JSX.Element {
    return (
      <ActionPanel title="vCenter Datastore">
        <Action
          title="Show Detail"
          icon={Icon.Eye}
          onAction={() => {
            setShowDetail((prevState) => !prevState);
          }}
        />
      </ActionPanel>
    );
  }

  function GetDatastoreDetail(index: number): JSX.Element {
    const capacity_tier: Map<string, number> = new Map([
      ["KB", 1e-3],
      ["MB", 1e-6],
      ["GB", 1e-9],
      ["TB", 1e-12],
    ]);
    let capacity = "Unknown";
    let free_space = "Unknown";

    capacity_tier.forEach((value, key) => {
      if (capacity === "Unknown") {
        const s = Number(Datastores[index].capacity) * value;
        if (s < 1000 && s > 1) {
          capacity = `${s.toFixed(2)} ${key}`;
        }
      }
      if (free_space === "Unknown") {
        const s = Number(Datastores[index].free_space) * value;
        if (s < 1000 && s > 1) {
          free_space = `${s.toFixed(2)} ${key}`;
        }
      }
    });

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={Datastores[index].name} />
            <List.Item.Detail.Metadata.Label title="Type" text={Datastores[index].type} />
            <List.Item.Detail.Metadata.Label title="Capacity" text={capacity} />
            <List.Item.Detail.Metadata.Label title="Free Space" text={free_space} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  React.useEffect(() => {
    setIsLoading(true);
    vCenterApi
      .ListDatastore()
      .then((datastores) => {
        if (datastores) {
          setNetworks([...datastores]);
        }
      })
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      });
    setIsLoading(false);
  }, []);

  if (!Datastores) return <List isLoading={isLoading}></List>;

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {!isLoading &&
        Datastores.map((datastore, index) => (
          <List.Item
            key={datastore.datastore}
            id={datastore.datastore}
            title={datastore.name}
            icon={{ source: "icons/datastore/datastore.svg" }}
            detail={GetDatastoreDetail(index)}
            actions={GetDatastoreAction()}
          />
        ))}
    </List>
  );
}
