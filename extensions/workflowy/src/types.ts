export interface WorkflowyNode {
  id: string;
  nm: string;
  parentId: string;
  metadata?: {
    mirror?: {
      isMirrorRoot: boolean;
      originalId: string;
    };
  };
  no?: string;
  cp?: number;
  ch?: WorkflowyNode[];
}

export interface WorkflowyFavourite {
  searchQuery: string;
  zoomedProject: {
    auxiliaryRootProjectId: string;
    projectid: string;
  };
}
