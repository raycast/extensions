export interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

export interface WorkItemDetails {
  id: number;
  fields: {
    "System.Title": string;
    "System.Description"?: string;
    "System.WorkItemType": string;
    "System.State": string;
    "System.Reason"?: string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.CreatedBy"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.TeamProject": string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "System.Tags"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
    "Microsoft.VSTS.Common.Severity"?: string;
    "Microsoft.VSTS.Common.StackRank"?: number;
    "Microsoft.VSTS.Scheduling.Effort"?: number;
    "Microsoft.VSTS.Scheduling.OriginalEstimate"?: number;
    "Microsoft.VSTS.Scheduling.RemainingWork"?: number;
    "Microsoft.VSTS.Scheduling.CompletedWork"?: number;
    "System.BoardColumn"?: string;
    "System.BoardColumnDone"?: boolean;
  };
}

export interface WorkItemRelationsData {
  parentItem: WorkItemLite | null;
  siblingItems: WorkItemLite[];
  relatedItems: WorkItemLite[];
  childItems: WorkItemLite[];
}

export interface WorkItemLite {
  id: number;
  title: string;
  description?: string;
  type?: string;
  teamProject?: string;
  state?: string;
}
