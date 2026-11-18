export type Environment = "test" | "live";
export type EnvProps = { environment: Environment; setEnvironment: (environment: Environment) => void };

export type StripeProfile = {
  id: string;
  name: string;
  testApiKey?: string;
  liveApiKey?: string;
  accountId?: string;
  color?: string;
  isDefault?: boolean;
};

export type ProfileContextValue = {
  activeProfile: StripeProfile | null;
  activeEnvironment: Environment;
  profiles: StripeProfile[];
  setActiveProfile: (profileId: string) => void;
  setActiveEnvironment: (env: Environment) => void;
  addProfile: (profile: Omit<StripeProfile, "id">) => void;
  updateProfile: (id: string, profile: Partial<StripeProfile>) => void;
  deleteProfile: (id: string) => void;
};
