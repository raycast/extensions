import { Color, Icon } from "@raycast/api";

export const baseUrl = "https://betteruptime.com/api/v2";

export const statusMap = {
  paused: {
    source: Icon.Pause,
    tintColor: Color.Orange,
  },
  pending: {
    source: Icon.Clock,
    tintColor: Color.SecondaryText,
  },
  maintenance: {
    source: Icon.CircleEllipsis,
    tintColor: Color.Blue,
  },
  up: {
    source: Icon.CheckCircle,
    tintColor: Color.Green,
  },
  validating: {
    source: Icon.QuestionMarkCircle,
    tintColor: Color.Yellow,
  },
  down: {
    source: Icon.XMarkCircle,
    tintColor: Color.Red,
  },
} as { [key: string]: { source: Icon; tintColor: Color } };

export const incidentStatusMap = {
  Unconfirmed: {
    source: Icon.QuestionMarkCircle,
    tintColor: Color.SecondaryText,
  },
  Started: {
    source: Icon.ExclamationMark,
    tintColor: Color.Red,
  },
  Acknowledged: {
    source: Icon.Eye,
    tintColor: Color.Orange,
  },
  Resolved: {
    source: Icon.CheckCircle,
    tintColor: Color.Green,
  },
  Validating: {
    source: Icon.Clock,
    tintColor: Color.Yellow,
  },
} as { [key: string]: { source: Icon; tintColor: Color } };
