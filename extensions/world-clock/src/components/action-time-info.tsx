import { Action } from "@raycast/api";
import { CurrentTime } from "../types/types";

export function ActionTimeInfo(props: { currentTime: CurrentTime }) {
  const { currentTime } = props;
  return (
    <>
      <Action.CopyToClipboard title={"Copy Time"} content={currentTime.timeZone + ": " + currentTime.dateTime} />
      <Action.CopyToClipboard title={`Copy All Info`} content={JSON.stringify(currentTime, null, 2)} />
    </>
  );
}
