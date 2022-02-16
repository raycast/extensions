export interface ITrackData {
  result: string;
  senderName: string;
  receiverName: string;
  itemName: string;
  invoiceNo: string;
  receiverAddr: string;
  level: number;
  complete: boolean;
  recipient: string;
  savedTime: string;
  completeYN: string;
  trackingDetails: TrackingDetail[];
  lastStateDetail: LastStateDetail;
  lastDetail: LastDetail;
  firstDetail: FirstDetail;
}

export interface TrackingDetail {
  time: number;
  timeString: string;
  where: string;
  kind: string;
  telno: string;
  telno2: string;
  level: number;
  manName: string;
  manPic: string;
}

export interface LastStateDetail {
  time: number;
  timeString: string;
  where: string;
  kind: string;
  telno: string;
  telno2: string;
  level: number;
  manName: string;
  manPic: string;
}

export interface LastDetail {
  time: number;
  timeString: string;
  where: string;
  kind: string;
  telno: string;
  telno2: string;
  level: number;
  manName: string;
  manPic: string;
}

export interface FirstDetail {
  time: number;
  timeString: string;
  where: string;
  kind: string;
  telno: string;
  telno2: string;
  level: number;
  manName: string;
  manPic: string;
}
