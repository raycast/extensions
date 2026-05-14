import { Color, getPreferenceValues } from "@raycast/api";
import Paymenter from "./paymenter";

const { paymenter_url, api_key } = getPreferenceValues<Preferences>();
export const paymenter = new Paymenter(paymenter_url, api_key);

export const TICKET_COLORS: Record<string, Color> = {
  open: Color.Green,
  closed: Color.Red,
  replied: Color.Blue,
};
