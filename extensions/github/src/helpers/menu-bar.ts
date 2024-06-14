import { getPreferenceValues } from "@raycast/api";

import { IssueFieldsFragment, PullRequestFieldsFragment } from "../generated/graphql";

function displayTitlePreference() {
  const prefs = getPreferenceValues();
  const val: boolean | undefined = prefs.showtext;
  return val == undefined ? true : val;
}

export enum SectionType {
  Open = "Open",
  Assigned = "Assigned",
  Mentioned = "Mentioned",
  ReviewRequests = "Review Requests",
  Reviewed = "Reviewed",
  RecentlyClosed = "Recently Closed",
}

export type PullRequestSection = {
  type: SectionType;
  pullRequests: PullRequestFieldsFragment[] | undefined;
  subtitle: string;
};

export type IssueSection = {
  type: SectionType;
  issues: IssueFieldsFragment[];
  subtitle: string;
};

type Sections = IssueSection[] | PullRequestSection[];

export function displayTitle(sections: Sections, scope: "issues" | "pullRequests"): string | undefined {
  const preferences = getPreferenceValues<Preferences.MyIssuesMenu & Preferences.MyPullRequestsMenu>();
  if (!displayTitlePreference()) {
    return undefined;
  }

  const sectionTypeMapping: Record<string, SectionType> = {
    includeOpenCount: SectionType.Open,
    includeAssignedCount: SectionType.Assigned,
    includeMentionedCount: SectionType.Mentioned,
    includeRecentlyClosedCount: SectionType.RecentlyClosed,
    includeReviewRequestsCount: SectionType.ReviewRequests,
    includeReviewedCount: SectionType.Reviewed,
  };

  const sectionTypesToInclude = Object.entries(preferences)
    .filter(([, value]) => value === true)
    .map(([key]) => sectionTypeMapping[key]);

  const count =
    scope === "pullRequests"
      ? sections.reduce(
          (acc, section) =>
            acc +
            (sectionTypesToInclude.includes(section.type) && (section as PullRequestSection).pullRequests
              ? (section as PullRequestSection).pullRequests!.length
              : 0),
          0,
        )
      : scope === "issues"
        ? sections.reduce(
            (acc, section) =>
              acc +
              (sectionTypesToInclude.includes(section.type) && (section as IssueSection).issues
                ? (section as IssueSection).issues.length
                : 0),
            0,
          )
        : 0;

  return `${count}`;
}

// Overload signatures
export function filterSections(
  sections: PullRequestSection[],
  preferences: Preferences.MyPullRequestsMenu,
  type: "pullRequests",
): PullRequestSection[];
export function filterSections(
  sections: IssueSection[],
  preferences: Preferences.MyIssuesMenu,
  type: "issues",
): IssueSection[];

export function filterSections(
  sections: PullRequestSection[] | IssueSection[],
  preferences: Preferences.MyPullRequestsMenu | Preferences.MyIssuesMenu,
  type: "pullRequests" | "issues",
) {
  const sectionMapping: Record<string, string> = {
    includeOpen: SectionType.Open,
    includeAssigned: SectionType.Assigned,
    includeReviewRequests: SectionType.ReviewRequests,
    includeReviewed: SectionType.Reviewed,
    includeRecentlyClosed: SectionType.RecentlyClosed,
    includeMentioned: SectionType.Mentioned,
  };

  const sectionTypesToInclude = Object.entries(preferences)
    .filter(([, value]) => value === true)
    .map(([key]) => sectionMapping[key]);

  return sections.filter((section) => {
    if (type === "pullRequests" && "pullRequests" in section) {
      return section.pullRequests && section.pullRequests.length > 0 && sectionTypesToInclude.includes(section.type);
    } else if (type === "issues" && "issues" in section) {
      return section.issues && section.issues.length > 0 && sectionTypesToInclude.includes(section.type);
    }
    return false;
  });
}
