import { SubmissionDetails } from "../types/submission-details.types";
import { changeCase } from "../utils";

function getTitle(submission: SubmissionDetails) {
  const platform = changeCase(submission.platform || "", "upper");
  if (platform === "IOS") {
    return `${platform} App ${changeCase(submission.submittedBuild.distribution, "sentence")} submission`;
  } else {
    return `${platform} Play ${changeCase(submission.submittedBuild.distribution, "sentence")} submission`;
  }
}

export default function generateSubmissionMarkdown(submission: SubmissionDetails): string {
  if (!submission) return ``;

  return `
## ${getTitle(submission)}


| **PROPERTY**      | **VALUE**       |
|-------------------|-----------------|
| Status        | ${submission.status} |
| Profile       | ${submission.submittedBuild.buildProfile} |
| Deployment    | ${submission.submittedBuild.appBuildVersion} |
| Version       | ${submission.submittedBuild.runtime?.version} |
| Build Number  | ${submission.submittedBuild.appBuildVersion} |
| Commit        | ${submission.submittedBuild.gitCommitHash} |
| Created By    | ${submission.submittedBuild.initiatingActor?.fullName} (${submission.submittedBuild.initiatingActor?.username}) |
  `;
}
