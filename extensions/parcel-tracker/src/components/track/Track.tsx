import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { getSearchPage, getTrackData } from "../../api/api";
import { ITrackData } from "../../model/trackData";

interface IProps {
  vendorKey: string;
  vendorName: string;
  defaultTrackNumber?: string;
}

export default function Track({ vendorKey, vendorName, defaultTrackNumber }: IProps) {
  const [trackNumber, setTrackNumber] = useState<string>(defaultTrackNumber || "");
  const [trackData, setTrackData] = useState<ITrackData>();
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (defaultTrackNumber !== undefined) search(trackNumber);
  }, [trackNumber]);

  const findPassportKey = (html: string) => {
    const index: number = html.indexOf("passportKey");
    const endIndex = html.indexOf('"', index + 15);
    return html.substring(index + 15, endIndex);
  };

  const search = (trackParameter: string) => {
    setLoading(true);
    getSearchPage()
      .then((response) => findPassportKey(response.data))
      .then((passportKey) => {
        getTrackData(vendorKey, trackParameter, passportKey).then((response) => {
          setTrackNumber(trackParameter);
          setTrackData(response.data);
          if (defaultTrackNumber) handleSave(response.data);
        });
      })
      .catch((error) => {
        setHasError(true);
        showToast({ style: Toast.Style.Failure, title: "Couldn't find your package information" });
      })
      .finally(() => setLoading(false));
  };

  const handleTextChange = (input: string) => {
    const regex = new RegExp("[0-9]{8}");
    if (regex.test(input)) {
      search(input);
    }
  };

  const handleSave = (data: ITrackData) => {
    const value = `${data.itemName || "UNKNOWN"}//${data.complete}`;
    LocalStorage.setItem(`${vendorKey}-${trackNumber}`, value).then(() =>
      showToast({ style: Toast.Style.Success, title: "Saved." })
    );
  };
  const convertDate = (dateString: string) => {
    return moment(dateString).format("YYYY-MM-DD hh:mm");
  };

  return (
    <List onSearchTextChange={handleTextChange} searchBarPlaceholder="Type your invoice number.." isLoading={loading}>
      {trackData && !hasError && trackData.trackingDetails.length > 0 ? (
        <List.Section title={trackData?.complete ? "Delivery completed" : "Delivery NOT completed"}>
          <List.Item
            title={"Item : " + (trackData.itemName || "UNKNOWN")}
            icon={trackData?.complete ? Icon.Checkmark : Icon.XmarkCircle}
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
      ) : (
        <List.Item title="Couldn't find your package information" />
      )}
      {trackData && !hasError && trackData.trackingDetails.length > 0 && (
        <List.Section title="Delivery history">
          {trackData.trackingDetails
            .sort((prev, next) => next.time - prev.time)
            .map((tracking, index) => (
              <List.Item
                key={index}
                icon={Icon.Binoculars}
                title={tracking.kind}
                subtitle={tracking.where}
                accessoryTitle={convertDate(tracking.timeString)}
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}
