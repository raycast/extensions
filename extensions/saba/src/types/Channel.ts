enum ChannelStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Channel {
  id: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  tvgId: string;
  title: string;
  resolution?: string;
  logoUrl: string;
  countryCode: string;
  groupTitle?: string;
  status: ChannelStatus;
}
