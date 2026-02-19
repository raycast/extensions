import type { Project, Organization, Branch } from "./types";

export const MOCK_ENABLED = false; // Set to true for screenshots

export const mockOrganizations: Organization[] = [
  { id: "org-1", name: "Acme Corporation" },
  { id: "org-2", name: "Personal Projects" },
];

export const mockProjects: Project[] = [
  {
    id: "abc123def456",
    organization_id: "org-1",
    name: "production-api",
    region: "us-east-1",
    created_at: "2024-06-15T10:30:00Z",
    status: "ACTIVE_HEALTHY",
  },
  {
    id: "xyz789ghi012",
    organization_id: "org-1",
    name: "staging-api",
    region: "us-east-1",
    created_at: "2024-08-20T14:45:00Z",
    status: "ACTIVE_HEALTHY",
  },
  {
    id: "mno345pqr678",
    organization_id: "org-1",
    name: "analytics-dashboard",
    region: "eu-west-1",
    created_at: "2024-09-10T09:00:00Z",
    status: "ACTIVE_HEALTHY",
  },
  {
    id: "stu901vwx234",
    organization_id: "org-2",
    name: "personal-blog",
    region: "ap-southeast-1",
    created_at: "2024-11-01T16:20:00Z",
    status: "ACTIVE_HEALTHY",
  },
  {
    id: "yza567bcd890",
    organization_id: "org-2",
    name: "side-project",
    region: "us-west-2",
    created_at: "2025-01-10T08:15:00Z",
    status: "COMING_UP",
  },
];

export const mockBranches: Record<string, Branch[]> = {
  abc123def456: [
    {
      id: "br-main-001",
      name: "main",
      project_ref: "abc123def456",
      parent_project_ref: "abc123def456",
      is_default: true,
      status: "ACTIVE_HEALTHY",
      created_at: "2024-06-15T10:30:00Z",
      updated_at: "2025-01-30T12:00:00Z",
    },
    {
      id: "br-feat-002",
      name: "feature/user-auth",
      project_ref: "abc123def456",
      parent_project_ref: "abc123def456",
      is_default: false,
      status: "ACTIVE_HEALTHY",
      created_at: "2025-01-25T09:00:00Z",
      updated_at: "2025-01-29T15:30:00Z",
    },
    {
      id: "br-feat-003",
      name: "feature/payment-integration",
      project_ref: "abc123def456",
      parent_project_ref: "abc123def456",
      is_default: false,
      status: "COMING_UP",
      created_at: "2025-01-28T14:00:00Z",
      updated_at: "2025-01-28T14:00:00Z",
    },
  ],
  xyz789ghi012: [
    {
      id: "br-main-004",
      name: "main",
      project_ref: "xyz789ghi012",
      parent_project_ref: "xyz789ghi012",
      is_default: true,
      status: "ACTIVE_HEALTHY",
      created_at: "2024-08-20T14:45:00Z",
      updated_at: "2025-01-28T10:00:00Z",
    },
  ],
};
