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
        showToast({ style: Toast.Style.Failure, title: "배송정보 조회를 실패했습니다." });
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
    const value = `${data.itemName || "택배사 미입력"}//${data.complete}`;
    LocalStorage.setItem(`${vendorKey}-${trackNumber}`, value).then(() =>
      showToast({ style: Toast.Style.Success, title: "저장되었습니다." })
    );
  };
  const convertDate = (dateString: string) => {
    return moment(dateString).format("YYYY-MM-DD hh:mm");
  };

  return (
    <List onSearchTextChange={handleTextChange} searchBarPlaceholder="운송장 번호를 입력하세요.." isLoading={loading}>
      {trackData && !hasError && trackData.trackingDetails.length > 0 ? (
        <List.Section title={trackData?.complete ? "배송완료" : "배송미완료"}>
          <List.Item
            title={"제품명 : " + (trackData.itemName || "택배사 미입력")}
            icon={trackData?.complete ? Icon.Checkmark : Icon.XmarkCircle}
            accessoryTitle={vendorName}
            actions={
              !defaultTrackNumber && (
                <ActionPanel>
                  <Action title="저장하기" onAction={() => handleSave(trackData)} />
                </ActionPanel>
              )
            }
          />
        </List.Section>
      ) : (
        <List.Item title="배송정보를 찾을 수 없습니다." />
      )}
      {trackData && !hasError && trackData.trackingDetails.length > 0 && (
        <List.Section title="배송 이력">
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
