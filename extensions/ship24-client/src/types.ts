export interface Ship24TrackingRequest {
  trackingNumber: string;
  originCountryCode?: string;
  destinationCountryCode?: string;
  destinationPostCode?: string;
  shippingDate?: string;
  courierCode?: string;
}

export interface Ship24Event {
  eventId: string;
  trackingNumber: string;
  eventTrackingNumber: string;
  status: string;
  occurrenceDatetime: string;
  order: number;
  datetime: string;
  hasNoTime: boolean;
  utcOffset: string;
  location: string;
  sourceCode: string;
  courierCode: string;
  statusCode: string;
  statusCategory: string;
  statusMilestone: string;
}

export interface Ship24Statistics {
  timestamps: {
    infoReceivedDatetime: string;
    inTransitDatetime: string;
    outForDeliveryDatetime: string;
    failedAttemptDatetime: string;
    deliveredDatetime: string;
    availableForPickupDatetime: string;
    exceptionDatetime: string;
  };
  statusCategory: string;
  statusMilestone: string;
}

export interface Ship24Shipment {
  shipmentId: string;
  statusCode: string;
  statusCategory: string;
  statusMilestone: string;
  originCountryCode: string;
  destinationCountryCode: string;
  delivery: {
    estimatedDeliveryDate: string | null;
    service: string | null;
    signedBy: string | null;
  };
  trackingNumbers: Array<{ tn: string }>;
  recipient: {
    name: string | null;
    address: string | null;
    postCode: string | null;
    city: string | null;
    subdivision: string | null;
  };
}

export interface Ship24TrackerInfo {
  trackerId: string;
  trackingNumber: string;
  shipmentReference: string | null;
  courierCode: string[];
  clientTrackerId: string | null;
  isSubscribed: boolean;
  isTracked: boolean;
  createdAt: string;
}

export interface Ship24Tracker {
  tracker: Ship24TrackerInfo;
  shipment: Ship24Shipment;
  events: Ship24Event[];
  statistics: Ship24Statistics;
}

export interface Ship24TrackingResponse {
  data: {
    trackings: Ship24Tracker[];
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export type OptionalTracker = Ship24Tracker | null;

export interface TrackingResultState {
  trackingNumber: string;
  name?: string;
  tracking?: OptionalTracker;
  error?: string;
}

export interface ErrorObject {
  message?: string;
  error?: string;
  [key: string]: unknown;
}
