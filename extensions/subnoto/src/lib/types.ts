export interface Preferences {
  apiAccessKey: string;
  apiSecretKey: string;
}

export interface Workspace {
  uuid: string;
  name: string;
  creationDate: number;
  updateDate: number;
  membersCount: number;
}

export interface Envelope {
  uuid: string;
  title: string;
  creationDate: number;
  updateDate: number;
  sentDate: number | null;
  status: "uploading" | "draft" | "approving" | "signing" | "complete" | "declined" | "canceled";
  workspaceUuid: string;
  owner: {
    uuid: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
  };
  metrics: {
    signatureCount: number;
    signatureRequiredCount: number;
    approvalCount: number;
    approvalRequiredCount: number;
  };
  tags: string[];
}
