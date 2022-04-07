import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import moment from "moment";
import React, { useEffect, useState } from "react";
<<<<<<< HEAD
import { cachedDataVersionTag } from "v8";
import { getTrackData } from "../../api/api";
=======
import { getSearchPage, getTrackData } from "../../api/api";
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
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

<<<<<<< HEAD
  const search = (trackParameter: string) => {
    setLoading(true);
    getTrackData(vendorKey, trackParameter)
      .then((response) => {
        setTrackNumber(trackParameter);
        setTrackData(response.data);
        if (defaultTrackNumber) handleSave(response.data);
      })
      .catch((error) => {
        setHasError(true);
        showToast({ style: Toast.Style.Failure, title: error });
=======
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
      .catch((_error) => {
        setHasError(true);
        showToast({ style: Toast.Style.Failure, title: "Couldn't find your package information" });
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
      })
      .finally(() => setLoading(false));
  };

  const handleTextChange = (input: string) => {
<<<<<<< HEAD
    const regex = new RegExp("[0-9]{8,}");
=======
    const regex = new RegExp("[0-9]{8}");
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
    if (regex.test(input)) {
      search(input);
    }
  };

  const handleSave = (data: ITrackData) => {
<<<<<<< HEAD
    const value = `${data.itemName || "UNKNOWN"}//${data.completeYN}`;
=======
    const value = `${data.itemName || "UNKNOWN"}//${data.complete}`;
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
    LocalStorage.setItem(`${vendorKey}-${trackNumber}`, value).then(() =>
      showToast({ style: Toast.Style.Success, title: "Saved." })
    );
  };
  const convertDate = (dateString: string) => {
    return moment(dateString).format("YYYY-MM-DD hh:mm");
  };

  return (
    <List
<<<<<<< HEAD
      throttle={true}
=======
      navigationTitle={`Track Package: ${vendorName}`}
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
      onSearchTextChange={handleTextChange}
      searchBarPlaceholder="Type your invoice number.."
      isLoading={loading}
    >
<<<<<<< HEAD
      {!hasError && trackData && trackData.details?.length > 0 ? (
        <List.Section title={trackData.completeYN ? "Delivery completed" : "Delivery NOT completed"}>
          <List.Item
            title={"Item : " + (trackData.itemName || "UNKNOWN")}
            icon={trackData.completeYN ? Icon.Checkmark : Icon.XmarkCircle}
            accessoryTitle={vendorName}
=======
      {!hasError && trackData && trackData.trackingDetails?.length > 0 ? (
        <List.Section title={trackData?.complete ? "Delivery completed" : "Delivery NOT completed"}>
          <List.Item
            title={"Item : " + (trackData.itemName || "UNKNOWN")}
            icon={trackData?.complete ? Icon.Checkmark : Icon.XmarkCircle}
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
            actions={
              !defaultTrackNumber && (
                <ActionPanel>
                  <Action title="Save" onAction={() => handleSave(trackData)} />
                </ActionPanel>
              )
            }
<<<<<<< HEAD
=======
            accessories={[
              {
                text: vendorName,
              },
            ]}
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
          />
        </List.Section>
      ) : (
        <List.Item title="Couldn't find your package information" />
      )}
<<<<<<< HEAD
      {!hasError && trackData && trackData.details?.length > 0 && (
        <List.Section title="Delivery history">
          {trackData.details
            // .sort((prev, next) => next.time - prev.time)
=======
      {!hasError && trackData && trackData.trackingDetails?.length > 0 && (
        <List.Section title="Delivery history">
          {trackData.trackingDetails
            .sort((prev, next) => next.time - prev.time)
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
            .map((tracking, index) => (
              <List.Item
                key={index}
                icon={Icon.Binoculars}
<<<<<<< HEAD
                title={tracking.trackingKind}
                subtitle={tracking.trackingWhere}
                accessoryTitle={convertDate(tracking.trackingTimeString)}
=======
                title={tracking.kind}
                subtitle={tracking.where}
                accessories={[
                  {
                    text: convertDate(tracking.timeString),
                  },
                ]}
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}
