import { describe, expect, it } from "vitest";
import { GEARSET_COMPARE_DEPLOY_URL, GEARSET_DEPLOYMENT_HISTORY_URL, gearsetDeploymentUrl } from "../navigation";

describe("Gearset navigation", () => {
  it("uses the authenticated Compare & Deploy and deployment history routes", () => {
    expect(GEARSET_COMPARE_DEPLOY_URL).toBe("https://app.gearset.com/configure");
    expect(GEARSET_DEPLOYMENT_HISTORY_URL).toBe("https://app.gearset.com/deployments/deployed");
  });

  it("builds an encoded direct deployment route", () => {
    expect(gearsetDeploymentUrl("deployment/id")).toBe("https://app.gearset.com/finished?deploymentId=deployment%2Fid");
  });
});
