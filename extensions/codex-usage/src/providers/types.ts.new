export interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetDate?: string;
  plan?: string;
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  
  isConfigured(): Promise<boolean>;
  fetchUsage(): Promise<UsageData>;
  getSetupInstructions(): string;
}
