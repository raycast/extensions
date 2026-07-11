export interface ITrackData {
  isCompleted: string;
  data: ITrack[];
}

export interface ITrack {
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
