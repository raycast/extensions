import { Color } from "@raycast/api";
import { updateUspsTracking, ableToTrackUspsRemotely, urlToUspsTrackingWebpage } from "./carriers/usps";
import { updateUpsTracking, ableToTrackUpsRemotely, urlToUpsTrackingWebpage } from "./carriers/ups";
import { updateFedexTracking, ableToTrackFedexRemotely, urlToFedexTrackingWebpage } from "./carriers/fedex";
import { Carrier } from "./types/carrier";

const carriers: Carrier[] = [
  {
    id: "usps",
    name: "USPS",
    color: Color.Blue,
    icon: "usps.png",
    updateTracking: updateUspsTracking,
    ableToTrackRemotely: ableToTrackUspsRemotely,
    urlToTrackingWebpage: urlToUspsTrackingWebpage,
  },
  {
    id: "ups",
    name: "UPS",
    color: Color.Orange,
    icon: "ups.png",
    updateTracking: updateUpsTracking,
    ableToTrackRemotely: ableToTrackUpsRemotely,
    urlToTrackingWebpage: urlToUpsTrackingWebpage,
  },
  {
    id: "fedex",
    name: "FedEx",
    color: Color.Purple,
    icon: "fedex.png",
    updateTracking: updateFedexTracking,
    ableToTrackRemotely: ableToTrackFedexRemotely,
    urlToTrackingWebpage: urlToFedexTrackingWebpage,
  },
];

export default new Map(carriers.map((carrier) => [carrier.id, carrier]));
