import { randomUUID } from "node:crypto";

import { LocalStorage } from "@raycast/api";

import { DEMO_PROJECT_ID } from "./demo-data";
import { inferDashboardUrl } from "./formatters";
import { getEffectivePlan, getLiveProjectLimit } from "./license-plan";
import { LicenseState, ProjectId, ProjectInput, StripeProject } from "./types";

const PROJECTS_KEY = "projects";
const ACTIVE_PROJECT_ID_KEY = "active-project-id";
const REVIEWED_FAILED_PAYMENTS_KEY = "reviewed-failed-payments";
const LICENSE_STATE_KEY = "license-state";

export async function getProjects() {
  const rawProjects = await LocalStorage.getItem<string>(PROJECTS_KEY);

  if (!rawProjects) {
    return [];
  }

  return JSON.parse(rawProjects) as StripeProject[];
}

async function saveProjects(projects: StripeProject[]) {
  await LocalStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function addProject(input: ProjectInput) {
  const now = new Date().toISOString();
  const project: StripeProject = {
    id: randomUUID(),
    name: input.name.trim(),
    secretKey: input.secretKey.trim(),
    dashboardUrl: inferDashboardUrl(
      input.secretKey.trim(),
      input.dashboardUrl?.trim(),
    ),
    createdAt: now,
    updatedAt: now,
  };
  const projects = await getProjects();
  const liveProjects = projects.filter((item) => !item.isDemo);
  const licenseState = await getLicenseState();
  const liveProjectLimit = getLiveProjectLimit(getEffectivePlan(licenseState));

  if (liveProjects.length >= liveProjectLimit) {
    throw new Error(
      "Starter includes one live Stripe project. Activate Pro in License & Billing to unlock unlimited local workspaces on this device.",
    );
  }

  const nextProjects = [
    ...projects.filter((item) => item.id !== project.id),
    project,
  ];

  await saveProjects(nextProjects);
  await setActiveProjectId(project.id);

  return project;
}

export async function removeProject(projectId: ProjectId) {
  const projects = await getProjects();
  const nextProjects = projects.filter((project) => project.id !== projectId);

  await saveProjects(nextProjects);

  const activeProjectId = await getActiveProjectId();
  if (activeProjectId === projectId) {
    await setActiveProjectId(nextProjects[0]?.id ?? null);
  }
}

export async function getActiveProjectId() {
  return (await LocalStorage.getItem<string>(ACTIVE_PROJECT_ID_KEY)) ?? null;
}

export async function setActiveProjectId(projectId: ProjectId | null) {
  if (!projectId) {
    await LocalStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
    return;
  }

  await LocalStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
}

export async function getActiveProject() {
  const [projects, activeProjectId] = await Promise.all([
    getProjects(),
    getActiveProjectId(),
  ]);

  if (!projects.length) {
    return null;
  }

  return (
    projects.find((project) => project.id === activeProjectId) ?? projects[0]
  );
}

export async function ensureDemoProject() {
  const projects = await getProjects();
  const existingDemo = projects.find(
    (project) => project.id === DEMO_PROJECT_ID,
  );

  if (existingDemo) {
    await setActiveProjectId(existingDemo.id);
    return existingDemo;
  }

  const now = new Date().toISOString();
  const demoProject: StripeProject = {
    id: DEMO_PROJECT_ID,
    name: "Project Alpha",
    secretKey: "sk_test_demo_1234567890",
    dashboardUrl: "https://dashboard.stripe.com/test",
    createdAt: now,
    updatedAt: now,
    isDemo: true,
  };

  await saveProjects([...projects, demoProject]);
  await setActiveProjectId(demoProject.id);

  return demoProject;
}

export async function getReviewedFailedPaymentIds() {
  const rawIds = await LocalStorage.getItem<string>(
    REVIEWED_FAILED_PAYMENTS_KEY,
  );

  if (!rawIds) {
    return [];
  }

  return JSON.parse(rawIds) as string[];
}

async function saveReviewedFailedPaymentIds(ids: string[]) {
  await LocalStorage.setItem(REVIEWED_FAILED_PAYMENTS_KEY, JSON.stringify(ids));
}

export async function markFailedPaymentReviewed(failedPaymentId: string) {
  const reviewedIds = await getReviewedFailedPaymentIds();

  if (reviewedIds.includes(failedPaymentId)) {
    return reviewedIds;
  }

  const nextIds = [...reviewedIds, failedPaymentId];
  await saveReviewedFailedPaymentIds(nextIds);
  return nextIds;
}

export async function markFailedPaymentUnreviewed(failedPaymentId: string) {
  const reviewedIds = await getReviewedFailedPaymentIds();
  const nextIds = reviewedIds.filter((id) => id !== failedPaymentId);
  await saveReviewedFailedPaymentIds(nextIds);
  return nextIds;
}

export async function getLicenseState() {
  const rawLicenseState = await LocalStorage.getItem<string>(LICENSE_STATE_KEY);

  if (!rawLicenseState) {
    return null;
  }

  return JSON.parse(rawLicenseState) as LicenseState;
}

export async function saveLicenseState(licenseState: LicenseState) {
  await LocalStorage.setItem(LICENSE_STATE_KEY, JSON.stringify(licenseState));
}

export async function clearLicenseState() {
  await LocalStorage.removeItem(LICENSE_STATE_KEY);
}
