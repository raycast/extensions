export type Project = {
  id: string;
  name: string;
  description?: string;
  url?: string;
};

export type WorkItem = {
  id: number;
  assignedTo?: string | Identity;
  workItemType: string;
  title: string;
  state: string;
  teamProject: string;
  changedDate: Date;
};

export type WorkItemExtended = {
  id: number;
  fields?: { [key: string]: any };
  _links?: { [key: string]: { href: string } };
  url?: string;
};

export type WorkItemDetailsField = {
  "System.Title": string;
  "System.TeamProject": string;
  "System.WorkItemType": string;
  "System.State": string;
  "System.Description": string;
  "System.CreatedDate": Date;
  "System.ChangedDate": Date;
  "System.CommentCount": number;
  "System.AssignedTo": Identity;
};

export type WorkItemType = {
  name: string;
  description: string;
  color: string;
  icon: { id: string; url: string };
  isDisibled: boolean;
};

export type Identity = {
  id: string;
  name: string;
  displayName: string;
  uniqueName: string;
  descriptor: string;
};
