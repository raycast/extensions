export type Values = {
  textfield: string;
  cast: string;
  embed?: string;
  image?: string;
  channel?: string;
};

export type ChannelResult = {
  result: {
    channel: {
      id: string;
      url: string;
      name: string;
      description: string;
      imageUrl: string;
      leadFid: number;
      hostFids: number[];
      createdAt: number;
      followerCount: number;
    };
  };
};

export type FileUploadResult = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
};

export type KeyRequestData = {
  deepLinkUrl: string;
  pollingToken: string;
  privateKey: string;
  publicKey: string;
};

export type PollRequestData = {
  state: string;
  userFid?: string;
};
