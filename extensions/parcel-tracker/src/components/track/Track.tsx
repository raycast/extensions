import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import moment from "moment";
import { useEffect, useState } from "react";
import { getTrackData } from "../../api/api";
import { ITrackData } from "../../model/trackData";
import { isEmpty } from "../../utils/utils";

interface IProps {
  vendorKey: string;
  vendorName: string;
  defaultTrackNumber?: string;
}

const isValidTrackingNumber = (input: string) => {
  const regex = new RegExp("[0-9]{8,}");
  return regex.test(input);
};

export default function Track({ vendorKey, vendorName, defaultTrackNumber }: IProps) {
  const [trackNumber, setTrackNumber] = useState(defaultTrackNumber || "");
  const [trackData, setTrackData] = useState<ITrackData>();
  const [loading, setLoading] = useState(Boolean(defaultTrackNumber));
  const [hasError, setHasError] = useState(false);
  const [searchText, setSearchText] = useState(trackNumber);

  useEffect(() => {
    if (defaultTrackNumber !== undefined) search(trackNumber);
  }, [trackNumber]);

  const search = (invoiceNo: string) => {
    setLoading(true);
    getTrackData(vendorKey, invoiceNo)
      .then((response) => {
        setTrackNumber(invoiceNo);
        setTrackData(response.data);
        if (defaultTrackNumber) handleSave(response.data);
      })
      .catch((error) => {
        setHasError(true);
        showToast({ style: Toast.Style.Failure, title: error });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleTextChange = (input: string) => {
    setSearchText(input);
    if (isValidTrackingNumber(input)) {
      search(input);
      return;
    }
  };

  const handleSave = (trackData: ITrackData) => {
    const value = `${trackData.data[0].itemName || ""}//${trackData.isCompleted}`;
    LocalStorage.setItem(`${vendorKey}-${trackNumber}`, value).then(() =>
      showToast({ style: Toast.Style.Success, title: "Saved." })
    );
  };

  const convertDate = (dateString: string) => {
    return isEmpty(dateString) ? "" : moment(dateString).format("YYYY-MM-DD HH:mm");
  };

  const ListItems = () => {
    const hasTrackingDetails = !hasError && trackData;
    if (!searchText && !defaultTrackNumber) {
      return <List.EmptyView icon="📦" title="Type your invoice number to get started" />;
    }
    if (loading) {
      return <List.EmptyView icon="📦" title="Searching…" />;
    }
    if (hasTrackingDetails) {
      return (
        <>
          <List.Section title={trackData.isCompleted ? "Delivery completed" : "Delivery NOT completed"}>
            <List.Item
              title={"Item : " + (trackData.data[0].itemName || "")}
              icon={trackData.isCompleted ? Icon.Checkmark : Icon.XmarkCircle}
              accessoryTitle={vendorName}
              actions={
                !defaultTrackNumber && (
                  <ActionPanel>
                    <Action title="Save" onAction={() => handleSave(trackData)} />
                  </ActionPanel>
                )
              }
            />
          </List.Section>
          <List.Section title="Delivery history">
            {trackData.data
              .sort((prev, next) => (prev.trackingTimeString > next.trackingTimeString ? 1 : -1))
              .map((tracking, index) => {
                return (
                  <List.Item
                    key={index}
                    icon={Icon.Binoculars}
                    title={tracking.trackingKind || tracking.trackingLevel || ""}
                    subtitle={tracking.trackingDescription}
                    accessoryTitle={convertDate(tracking.trackingTimeString)}
                  />
                );
              })}
          </List.Section>
        </>
      );
    }
    if (!isValidTrackingNumber(searchText)) {
      return (
        <List.EmptyView
          icon="📦"
          title="Invalid invoice number"
          description="An invoice number must be at least 8 digits long"
        />
      );
    }
    return <List.EmptyView icon="📦" title="Couldn't find your parcel" description="Try a different invoice number" />;
  };
  return (
    <List
      throttle={true}
      onSearchTextChange={handleTextChange}
      searchBarPlaceholder="Type your invoice number.."
      isLoading={loading}
      navigationTitle={`Track ${vendorName} Package`}
    >
      <ListItems />
    </List>
  );
}
