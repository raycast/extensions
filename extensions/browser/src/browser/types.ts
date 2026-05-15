import type { LaunchProps } from "@raycast/api";

export type BrowserProfile = {
  id: string;
  name: string;
  browserApp: string;
  profileDirectory: string;
  isDefault?: boolean;
};

export type ProfileFormValues = {
  name: string;
  browserApp: string;
  profileDirectory: string;
  isDefault: boolean;
};

export type ProfilesState = {
  profiles: BrowserProfile[];
  setProfiles: (profiles: BrowserProfile[]) => Promise<void>;
};

export type ProfileEditorProps = ProfilesState & {
  profile?: BrowserProfile;
  initialName?: string;
};

export type CommandProps = LaunchProps<{ arguments: { query: string; profile?: string } }>;
