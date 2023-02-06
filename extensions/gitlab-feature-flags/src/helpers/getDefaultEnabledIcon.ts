import { Color, Icon } from "@raycast/api";

const getDefaultEnabledIcon = (enabled: boolean) =>
  enabled ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.XMarkCircle, tintColor: Color.Red };

export default getDefaultEnabledIcon;
