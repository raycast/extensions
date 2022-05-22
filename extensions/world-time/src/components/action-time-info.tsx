import { Action } from "@raycast/api";
import { TimeInfo } from "../types/types";
import { buildTimeByUTCTime } from "../utils/common-utils";
import React from "react";

export function ActionTimeInfo(props: { timeInfo: TimeInfo }) {
  const { timeInfo } = props;
  return (
    <>
      <Action.CopyToClipboard
        title={"Copy Time"}
        content={timeInfo.timezone + ": " + buildTimeByUTCTime(timeInfo.datetime)}
      />
      <Action.CopyToClipboard title={`Copy All Info`} content={JSON.stringify(timeInfo, null, 2)} />
    </>
  );
}
