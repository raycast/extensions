/**
 * Custom hook for profile switching state management
 * Follows Single Responsibility Principle by separating switching logic from UI
 */

import { useState, useCallback } from "react";
import { ProfileSummary } from "../types/profile-types";
import { StorageResult } from "../types";
import { ProfileSwitchResult } from "../services/interfaces/IProfileManager";
import { DetailedValidationResult } from "../utils/validation";
import { useProfileManager, useNotificationService } from "../context/ServiceProvider";

export interface ProfileSwitchingState {
  isLoading: boolean;
  isSwitching: boolean;
  switchingProfileId: string | null;
  lastSwitchResult: ProfileSwitchResult | null;
  error: string | null;
}

export interface ProfileSwitchingActions {
  switchToProfile: (profile: ProfileSummary) => Promise<ProfileSwitchResult>;
  clearError: () => void;
  clearLastResult: () => void;
  checkSystemRequirements: () => Promise<boolean>;
}

export interface UseProfileSwitchingResult extends ProfileSwitchingState, ProfileSwitchingActions {}

/**
 * Hook for managing profile switching state and operations
 */
export function useProfileSwitching(): UseProfileSwitchingResult {
  const profileManager = useProfileManager();
  const notificationService = useNotificationService();

  const [state, setState] = useState<ProfileSwitchingState>({
    isLoading: false,
    isSwitching: false,
    switchingProfileId: null,
    lastSwitchResult: null,
    error: null,
  });

  const switchToProfile = useCallback(
    async (profile: ProfileSummary): Promise<ProfileSwitchResult> => {
      try {
        setState((prev) => ({
          ...prev,
          isSwitching: true,
          switchingProfileId: profile.id,
          error: null,
          lastSwitchResult: null,
        }));

        // Check if profile is already active
        if (profile.isActive) {
          await notificationService.showSuccess(`${profile.name} is already active`);

          const result: ProfileSwitchResult = {
            success: true,
            message: `${profile.name} is already active`,
          };

          setState((prev) => ({
            ...prev,
            isSwitching: false,
            switchingProfileId: null,
            lastSwitchResult: result,
          }));

          return result;
        }

        // Perform the actual switch
        const result = await profileManager.switchToProfile(profile.id);

        setState((prev) => ({
          ...prev,
          isSwitching: false,
          switchingProfileId: null,
          lastSwitchResult: result,
          error: result.success ? null : result.error || "Unknown error occurred",
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        const result: ProfileSwitchResult = {
          success: false,
          error: errorMessage,
        };

        setState((prev) => ({
          ...prev,
          isSwitching: false,
          switchingProfileId: null,
          lastSwitchResult: result,
          error: errorMessage,
        }));

        return result;
      }
    },
    [profileManager, notificationService],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearLastResult = useCallback(() => {
    setState((prev) => ({ ...prev, lastSwitchResult: null }));
  }, []);

  const checkSystemRequirements = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await profileManager.checkSystemRequirements();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.success ? null : result.error || "System requirements check failed",
      }));

      if (!result.success) {
        await notificationService.showError(
          "System Requirements Check Failed",
          result.error || "Claude Desktop may not be properly installed",
        );
      }

      return result.success && result.data === true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      await notificationService.showError("System Check Error", errorMessage);
      return false;
    }
  }, [profileManager, notificationService]);

  return {
    ...state,
    switchToProfile,
    clearError,
    clearLastResult,
    checkSystemRequirements,
  };
}

/**
 * Hook for managing profile switching validation
 */
export function useProfileSwitchValidation() {
  const profileManager = useProfileManager();

  const [validationState, setValidationState] = useState<{
    isValidating: boolean;
    validationResult: DetailedValidationResult | null;
    error: string | null;
  }>({
    isValidating: false,
    validationResult: null,
    error: null,
  });

  const validateProfileForSwitch = useCallback(
    async (profileId: string) => {
      try {
        setValidationState((prev) => ({ ...prev, isValidating: true, error: null }));

        // Get the profile
        const profileResult = await profileManager.getProfile(profileId);
        if (!profileResult.success || !profileResult.data) {
          throw new Error(profileResult.error || "Profile not found");
        }

        // Validate the profile
        const validationResult = await profileManager.validateProfile(profileResult.data);

        setValidationState({
          isValidating: false,
          validationResult,
          error: null,
        });

        return validationResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Validation failed";

        setValidationState({
          isValidating: false,
          validationResult: null,
          error: errorMessage,
        });

        return null;
      }
    },
    [profileManager],
  );

  const clearValidation = useCallback(() => {
    setValidationState({
      isValidating: false,
      validationResult: null,
      error: null,
    });
  }, []);

  return {
    ...validationState,
    validateProfileForSwitch,
    clearValidation,
  };
}

/**
 * Hook for system status monitoring during profile switching
 */
export function useSystemStatus() {
  const profileManager = useProfileManager();

  const [systemStatus, setSystemStatus] = useState<{
    isLoading: boolean;
    status: StorageResult<{
      claudeInstalled: boolean;
      configExists: boolean;
      configWritable: boolean;
      activeProfile: string | null;
      totalProfiles: number;
    }> | null;
    error: string | null;
  }>({
    isLoading: false,
    status: null,
    error: null,
  });

  const checkSystemStatus = useCallback(async () => {
    try {
      setSystemStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await profileManager.getSystemStatus();

      setSystemStatus({
        isLoading: false,
        status: result.success && result.data ? result : null,
        error: result.success ? null : result.error || "Failed to get system status",
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      setSystemStatus({
        isLoading: false,
        status: null,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [profileManager]);

  return {
    ...systemStatus,
    checkSystemStatus,
  };
}
