import { Build } from "../types/build-details.types";
import { changeCase, humanDateTime } from "../utils";

function getTitle(build: Build) {
  const platform = changeCase(build.platform || "", "upper");
  if (platform === "IOS") {
    return `${platform} App ${changeCase(build.distribution, "sentence")} Build`;
  } else {
    return `${platform} Play ${changeCase(build.distribution, "sentence")} Build`;
  }
}

export default function generateBuildMarkdown(build: Build): string {
  if (!build) return ``;

  return `
## ${getTitle(build)}


| **PROPERTY**      | **VALUE**       |
|-------------------|-----------------|
| Profile       | ${build.buildProfile} |
| Deployment    | ${build.deployment.channel.name} |
| Version       | ${build.runtime?.version} |
| Build Number  | ${build.appBuildVersion} |
| Commit        | ${build.gitCommitHash} |
| Created By    | ${build.initiatingActor?.fullName} (${build.initiatingActor?.username}) |

## Build Artifact

| **PROPERTY**      | **VALUE**       |
|-------------------|-----------------|
| Status        | ${build.status} |
| Start time    | ${humanDateTime(new Date(build.workerStartedAt))} |
| Wait time     | ${build.metrics?.buildWaitTime}s |
| Queue time    | ${build.metrics?.buildQueueTime} |
| Build Time    | ${build.metrics?.buildDuration} |
| Availability  | ${Math.ceil((new Date(build.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days |

  `;
}
