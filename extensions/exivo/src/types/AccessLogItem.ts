export type AccessLogComponent = {
  identifier: string;
  labelling: string | null;
  id: string;
  title: string;
};

export type AccessLogItemData = {
  component: AccessLogComponent;
  apiIdentifier?: string;
  medium?: {
    id: string;
    cid: string;
    uid: string | null;
    keyLabel: string;
    caption: string | null;
    identifier: string;
    sequenceNumber: string;
    formFactor: string;
    publicRegistrationId: string;
    mobileApp: Record<string, unknown>;
  };
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    picture: string;
    userName: string;
  };
};

export type AccessLogItem = {
  id: string;
  data: AccessLogItemData;
  name: string;
  occurredAt: string;
};
