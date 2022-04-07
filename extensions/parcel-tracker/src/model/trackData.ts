export interface ITrackData {
<<<<<<< HEAD
  id: string;
  vendorId: number;
=======
  result: string;
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
  senderName: string;
  receiverName: string;
  itemName: string;
  invoiceNo: string;
  receiverAddr: string;
<<<<<<< HEAD
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
=======
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
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
}
