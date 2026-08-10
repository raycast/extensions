import { ReactNode } from "react";

// Link type for data structure
export interface Link {
  id: string;
  title: string;
  url: string;
  path: string;
}

// Props for command components
export interface CommandProps {
  property?: string;
  title?: string;
  children?: ReactNode;
}

// Type for the useLinks hook return value
export interface UseLinksResult {
  links: Link[];
  isLoading: boolean;
}
