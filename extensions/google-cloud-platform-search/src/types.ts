export interface Project {
  name: string;
  projectId: string;
  displayName?: string | null;
}

export interface ConsoleProduct {
  name: string;
  toUrl: (project: string) => string;
}

export interface ConsoleProductWithLowerName extends ConsoleProduct {
  lowerName: string;
}

export interface DocumentationProduct {
  id: string;
  title: string;
  documentationLink: string;
  preferred: boolean;
}

export interface DiscoveryAPI {
  items: DocumentationProduct[];
}

// projectId -> weight (positive float)
// weight is the number of times the project has been used scaled by a daily decay factor
export type ProjectUsage = { [projectId: string]: number };

// projectId -> product Name -> weight (positive float)
// weight is the number of times a certain product has been used within a certain project,
//  scaled by a daily decay factor
export type ProductUsage = { [projectId: string]: { [productName: string]: number } };
