import { LocalStorage } from "@raycast/api";
import type { ApplicationStatus, RoleType } from "./roles";

const APPLIED_JOBS_KEY = "applied_jobs";

export interface AppliedRole {
  id: number;
  company: string;
  role: string;
  role_type: RoleType;
  appliedDate: string;
  application_url: string;
  status: ApplicationStatus;
  locations: string[];
  statusUpdatedAt?: string;
  notes?: string;
}

function normalizeRoleType(rt: unknown): RoleType | null {
  if (rt === "New Grad" || rt === "Internship") return rt;
  if (rt === "jobs") return "New Grad";
  if (rt === "internships") return "Internship";
  return null;
}

export async function markAsSaved(job: AppliedRole): Promise<void> {
  const existing = await getSavedRoles();
  const updated = [...existing.filter((j) => j.id !== job.id), job];
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

export async function getSavedRoles(role_type?: RoleType): Promise<AppliedRole[]> {
  const stored = await LocalStorage.getItem<string>(APPLIED_JOBS_KEY);
  if (!stored) return [];

  const raw: AppliedRole[] = JSON.parse(stored) as AppliedRole[];
  let mutated = false;

  const normalized = raw
    .map((job) => {
      const norm = normalizeRoleType(job.role_type);
      if (!norm) return null;
      if (norm !== job.role_type) {
        mutated = true;
        return { ...job, role_type: norm };
      }
      return job;
    })
    .filter(Boolean) as AppliedRole[];

  if (mutated) {
    await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(normalized));
  }

  if (role_type) {
    return normalized.filter((job) => job.role_type === role_type);
  }
  return normalized;
}

export async function hasBothRoleTypes(): Promise<boolean> {
  const existing = await getSavedRoles(); // uses normalized values
  const hasInternship = existing.some((job) => job.role_type === "Internship");
  const hasNewGrad = existing.some((job) => job.role_type === "New Grad");
  return hasInternship && hasNewGrad;
}

export async function removeFromSaved(jobId: number): Promise<void> {
  const existing = await getSavedRoles();
  const updated = existing.filter((j) => j.id !== jobId);
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

export async function updateApplicationStatus(jobId: number, status: ApplicationStatus): Promise<void> {
  const existing = await getSavedRoles();
  const updated = existing.map((job) =>
    job.id === jobId ? { ...job, status, statusUpdatedAt: new Date().toISOString() } : job,
  );
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}
