import React, { createContext, useState, useEffect, ReactNode } from "react";
import { List } from "@raycast/api";
import { ProfileContextValue, StripeProfile, Environment } from "@src/types";
import {
  saveProfiles,
  saveActiveProfileId,
  generateProfileId,
  initializeProfiles,
  getActiveProfileConfig,
  saveActiveEnvironment,
} from "@src/utils/profile-storage";
import { StripeGuide } from "@src/components/organisms";

export const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
  skipGuide?: boolean;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children, skipGuide = false }) => {
  const [profiles, setProfiles] = useState<StripeProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeEnvironment, setActiveEnvironmentState] = useState<Environment>("live");
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize profiles first, then get the active config
    initializeProfiles()
      .then(() => getActiveProfileConfig())
      .then(({ profiles: storedProfiles, activeProfileId: storedActiveId, activeEnvironment: storedEnvironment }) => {
        setProfiles(storedProfiles);
        setActiveProfileId(storedActiveId);
        setActiveEnvironmentState(storedEnvironment);
        setIsInitialized(true);
      })
      .catch((error) => {
        setInitError(error instanceof Error ? error.message : "Failed to initialize profiles");
        setIsInitialized(true);
      });
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  const shouldShowGuide =
    !skipGuide &&
    isInitialized &&
    !initError &&
    activeProfile?.isDefault &&
    !activeProfile.testApiKey &&
    !activeProfile.liveApiKey;

  const setActiveProfile = async (profileId: string) => {
    setActiveProfileId(profileId);
    await saveActiveProfileId(profileId);
  };

  const setActiveEnvironment = async (env: Environment) => {
    setActiveEnvironmentState(env);
    await saveActiveEnvironment(env);
  };

  const addProfile = async (profileData: Omit<StripeProfile, "id">) => {
    const newProfile: StripeProfile = { ...profileData, id: generateProfileId() };
    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    await saveProfiles(updatedProfiles);

    if (profiles.length === 0) {
      await setActiveProfile(newProfile.id);
    }
  };

  const updateProfile = async (id: string, updates: Partial<StripeProfile>) => {
    const updatedProfiles = profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProfiles(updatedProfiles);
    await saveProfiles(updatedProfiles);
  };

  const deleteProfile = async (id: string) => {
    if (profiles.length <= 1) return;

    const updatedProfiles = profiles.filter((p) => p.id !== id);
    setProfiles(updatedProfiles);
    await saveProfiles(updatedProfiles);

    if (activeProfileId === id && updatedProfiles[0]) {
      await setActiveProfile(updatedProfiles[0].id);
    }
  };

  if (!isInitialized) {
    return <List isLoading={true} searchBarPlaceholder="Loading profiles..." />;
  }

  if (initError) {
    return (
      <List>
        <List.EmptyView
          title="Failed to Initialize Profiles"
          description={`${initError}\n\nTry restarting the extension or check your configuration.`}
        />
      </List>
    );
  }

  if (shouldShowGuide) {
    return <StripeGuide />;
  }

  const contextValue: ProfileContextValue = {
    activeProfile,
    activeEnvironment,
    profiles,
    setActiveProfile,
    setActiveEnvironment,
    addProfile,
    updateProfile,
    deleteProfile,
  };

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
};
