import type { JiraIssueStatus } from "@/types";

export type JiraTransition = {
  /**
   * Transition ID
   */
  id: string;
  name: string;
  to: JiraIssueStatus;
};

export type JiraIssueTransitionsResponse = {
  expand: string;
  transitions: JiraTransition[];
};

export type JiraIssueTransitionRequest = {
  transition: {
    id: string;
  };
};
