import { faker } from "@faker-js/faker";
import { Project, Issue, Organization, User } from "./types";

function fakeOrganization(): Organization {
  const name = faker.company.name();
  return {
    id: faker.string.uuid(),
    name: name,
    slug: faker.helpers.slugify(name),
  };
}

function fakeProject(organization: Organization): Project {
  const name = faker.hacker.noun();
  return {
    id: faker.string.uuid(),
    name: name,
    organization: organization,
    slug: faker.helpers.slugify(name),
    color: faker.color.rgb(),
    dateCreated: faker.date.recent().toUTCString(),
  };
}

function fakeUser(): User {
  return {
    type: "user",
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
  };
}

function fakeIssue(project: Project): Issue {
  return {
    id: faker.string.uuid(),
    count: faker.number.int({ max: 99999 }),
    lastSeen: faker.date.recent().toUTCString(),
    level: faker.helpers.arrayElement(["info", "warning", "error"]),
    permalink: faker.internet.url(),
    title: faker.hacker.phrase(),
    shortId: faker.string.sample(5),
    userCount: faker.number.int({ max: 99999 }),
    project: project,
    assignedTo: fakeUser(),
    culprit: faker.hacker.phrase(),
    firstSeen: faker.date.recent().toUTCString(),
    tags: [],
  };
}

export async function fakeProjects(organization?: Organization): Promise<Project[]> {
  const org = organization ?? fakeOrganization();
  const projects = new Array<Project>();
  for (let i = 0; i < 5; i++) {
    const project = fakeProject(org);
    projects.push(project);
  }
  return projects;
}

export async function fakeIssues(project?: Project): Promise<Issue[]> {
  const proj = project ?? fakeProject(fakeOrganization());
  const issues = new Array<Issue>();
  for (let i = 0; i < 10; i++) {
    const issue = fakeIssue(proj);
    issues.push(issue);
  }
  return issues.sort((lhs, rhs) => (new Date(lhs.lastSeen) < new Date(rhs.lastSeen) ? 1 : -1));
}

export const isFakeData = false;
