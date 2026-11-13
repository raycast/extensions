import { describe, expect, it } from "vitest";
import type { Environment, LegacyProject, ModernProject } from "./interfaces";
import {
  environmentPagePath,
  panelUrl,
  projectPagePath,
  serviceDeploymentsPagePath,
  servicePagePath,
} from "./dokploy-pages";

const noServices = { applications: [], mariadb: [], mongo: [], mysql: [], postgres: [], redis: [], compose: [] };

function environment(environmentId: string, isDefault?: boolean): Environment {
  return {
    ...noServices,
    environmentId,
    name: environmentId,
    description: "",
    createdAt: "",
    env: "",
    projectId: "p1",
    isDefault,
  };
}

function modernProject(environments: Environment[]): ModernProject {
  return { projectId: "p1", name: "", description: "", createdAt: "", organizationId: "", env: "", environments };
}

const legacyProject: LegacyProject = {
  ...noServices,
  projectId: "p1",
  name: "",
  description: "",
  createdAt: "",
  organizationId: "",
  env: "",
};

describe("servicePagePath", () => {
  it("nests a service under its environment (v0.25.0+)", () => {
    expect(servicePagePath({ projectId: "p1", environmentId: "e1", type: "application", id: "a1" })).toBe(
      "dashboard/project/p1/environment/e1/services/application/a1",
    );
  });

  it("uses the project-level path when there is no environment (before v0.25.0)", () => {
    expect(servicePagePath({ projectId: "p1", type: "postgres", id: "db1" })).toBe(
      "dashboard/project/p1/services/postgres/db1",
    );
  });

  it("opens the Deployments tab for deployment links", () => {
    expect(serviceDeploymentsPagePath({ projectId: "p1", environmentId: "e1", type: "compose", id: "c1" })).toBe(
      "dashboard/project/p1/environment/e1/services/compose/c1?tab=deployments",
    );
  });
});

describe("environmentPagePath", () => {
  it("links to the environment page", () => {
    expect(environmentPagePath("p1", "e1")).toBe("dashboard/project/p1/environment/e1");
  });
});

describe("projectPagePath", () => {
  it("opens the default environment", () => {
    const project = modernProject([environment("e1"), environment("e2", true)]);
    expect(projectPagePath(project)).toBe("dashboard/project/p1/environment/e2");
  });

  it("falls back to the first environment when none is marked default", () => {
    const project = modernProject([environment("e1"), environment("e2")]);
    expect(projectPagePath(project)).toBe("dashboard/project/p1/environment/e1");
  });

  it("has no page for a project without environments", () => {
    expect(projectPagePath(modernProject([]))).toBeUndefined();
  });

  it("uses the project page before v0.25.0", () => {
    expect(projectPagePath(legacyProject)).toBe("dashboard/project/p1");
  });
});

describe("panelUrl", () => {
  it.each([
    ["https://dokploy.example.com/api/", "https://dokploy.example.com/dashboard/project/p1"],
    ["http://1.2.3.4:3000/api/", "http://1.2.3.4:3000/dashboard/project/p1"],
    ["https://example.com/panel/api/", "https://example.com/panel/dashboard/project/p1"],
  ])("resolves against the API base %s", (apiUrl, expected) => {
    expect(panelUrl(apiUrl, "dashboard/project/p1")).toBe(expected);
  });
});
