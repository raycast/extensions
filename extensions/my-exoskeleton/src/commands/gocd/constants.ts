import { StageStatus } from "./types";
import { Color, Icon } from "@raycast/api";

export const GOCDAcceptHeaders = {
  v1: { "Accept": "application/vnd.go.cd.v1+json" },
  v3: { "Accept": "application/vnd.go.cd.v3+json" },
}

export const IconMap: Record<StageStatus, any> = {
  Passed: {
    source: Icon.CheckCircle,
    tintColor: Color.Green
  },
  Building: {
    source: Icon.Hourglass,
    tintColor: Color.Yellow
  },
  Unknown: {
    source: Icon.LivestreamDisabled,
    tintColor: Color.SecondaryText
  },
  Failed: {
    source: Icon.MinusCircle,
    tintColor: Color.Red
  },
  Cancelled: {
    source: Icon.Warning,
    tintColor: Color.Yellow
  },
};
