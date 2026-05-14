export interface AmpUsage {
  email: string;
  nickname: string;
  ampFree: {
    used: number;
    total: number;
    unit: string;
    replenishRate?: string;
    bonus?: string;
  };
  individualCredits: {
    remaining: number;
    unit: string;
  };
}

export interface AmpError {
  type: "not_found" | "not_logged_in" | "unknown";
  message: string;
}
