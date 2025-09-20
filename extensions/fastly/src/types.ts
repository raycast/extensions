export interface FastlyVersion {
  number: number;
  active: boolean;
  locked: boolean;
  deployed: boolean;
  staging: boolean;
  testing: boolean;
  created_at: string;
  updated_at: string;
  domains: Array<{ name: string }>; // Make sure this exists
}

export interface FastlyServiceDetails extends FastlyService {
  active_version: number;
  versions: FastlyVersion[];
}

export interface FastlyService {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface FastlyCustomer {
  id: string;
  name: string;
  pricing_plan: string;
  created_at: string;
  updated_at: string;
}

export interface FastlyStats {
  // Common stats
  requests?: number;
  errors?: number;
  status_2xx?: number;
  status_3xx?: number;
  status_4xx?: number;
  status_5xx?: number;
  bandwidth?: number;

  // CDN-specific stats
  hits?: number;
  miss?: number;
  hit_ratio?: number;
  shield?: number;

  // Compute-specific stats
  compute_requests?: number;
  compute_execution_time_ms?: number;
}

// Supported roles in Fastly
export type FastlyRole = "user" | "billing" | "engineer" | "superuser";

// Request structure for team invitations
interface ServiceInvitation {
  type: "service_invitation";
  id: string;
}

export interface FastlyInvitationRequest {
  data: {
    type: "invitation";
    attributes: {
      email: string;
      limit_services: boolean;
      role: FastlyRole;
      status_code: null;
    };
    relationships: {
      customer: {
        data: {
          type: "customer";
          id: string;
        };
      };
      service_invitations: {
        data: ServiceInvitation[];
      };
    };
  };
}

export interface CreateServiceResponse {
  data: {
    id: string;
    type: "service";
    attributes: {
      name: string;
      type: "wasm" | "vcl";
    };
  };
}

// Response structure from invitation endpoint
export interface FastlyInvitationResponse {
  data: {
    id: string;
    type: "invitation";
    attributes: {
      email: string;
      role: FastlyRole;
      status: "pending" | "accepted" | "declined";
      created_at: string;
      updated_at: string;
    };
  };
}

// Preferences interface for Raycast extension
export interface Preferences {
  apiToken: string;
  customerId: string;
}

// Parameters for inviting team members
export interface InviteTeamMemberParams {
  email: string;
  role: FastlyRole;
  name: string;
}

// Error response from Fastly API
export interface FastlyErrorResponse {
  detail: string;
  status: number;
  title: string;
}
