export interface ITrackData {
  id: string;
  vendorId: number;
  senderName: string;
  receiverName: string;
  itemName: string;
  invoiceNo: string;
  receiverAddr: string;
  level: string;
  recipient: string;
  completeYN: string;
  details: TrackingDetail[];
}

export interface TrackingDetail {
  trackingDate: string;
  trackingTime: string;
  trackingTimeString: string;
  trackingWhere: string;
  trackingKind: string;
  trackingDescription: string;
  trackingTelno: string;
  trackingTelno2: string;
  trackingLevel: string;
  trackingManName: string;
  trackingManPic: string;
}
