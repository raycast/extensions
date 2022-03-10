import { faker } from "@faker-js/faker";
import { environment } from "@raycast/api";
import { Project, Issue, Organization } from "./types";

function fakeOrganization() {
  const name = faker.company.companyName();
  return {
    id: faker.datatype.uuid(),
    name: name,
    slug: faker.helpers.slugify(name),
  };
}

function fakeProject(organization: Organization) {
  const name = faker.hacker.noun();
  return {
    id: faker.datatype.uuid(),
    name: name,
    organization: organization,
    slug: faker.helpers.slugify(name),
    color: faker.internet.color(),
    dateCreated: faker.date.recent().toUTCString(),
  };
}

function fakeIssue(project: Project) {
  return {
    id: faker.datatype.uuid(),
    count: faker.datatype.number(),
    lastSeen: faker.date.recent().toUTCString(),
    level: faker.helpers.randomize(["info", "warning", "error"]),
    permalink: faker.internet.url(),
    title: faker.hacker.phrase(),
    shortId: faker.datatype.string(5),
    userCount: faker.datatype.number(),
    project: project,
  };
}

export function fakeProjects(organization?: Organization) {
  const org = organization ?? fakeOrganization();
  const projects = new Array<Project>();
  for (let i = 0; i < 5; i++) {
    const project = fakeProject(org);
    projects.push(project);
  }
  return projects;
}

export function fakeIssues(project?: Project) {
  const proj = project ?? fakeProject(fakeOrganization());
  const issues = new Array<Issue>();
  for (let i = 0; i < 10; i++) {
    const issue = fakeIssue(proj);
    issues.push(issue);
  }
  return issues.sort((lhs, rhs) => (new Date(lhs.lastSeen) < new Date(rhs.lastSeen) ? 1 : -1));
}

export const isFakeData = false;
