/**
 * Custom hook for profile form state management
 * Follows Single Responsibility Principle by separating form logic from UI
 */

import { useState, useCallback, useEffect } from "react";
import { MCPServerConfig } from "../types";
import { MCPProfile, CreateProfileInput, UpdateProfileInput } from "../types/profile-types";
import { useProfileManager, useValidationService, useNotificationService } from "../context/ServiceProvider";
import { DetailedValidationResult } from "../utils/validation";

export interface MCPServerFormData extends MCPServerConfig {
  name: string;
  envVars: string; // JSON string representation of env vars
}

export interface ProfileFormData {
  name: string;
  description: string;
  servers: MCPServerFormData[];
}

export interface ProfileFormState {
  formData: ProfileFormData;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  validationResult: DetailedValidationResult | null;
  isDirty: boolean;
}

export interface ProfileFormActions {
  updateField: (field: keyof ProfileFormData, value: ProfileFormData[keyof ProfileFormData]) => void;
  updateServer: (index: number, field: keyof MCPServerFormData, value: string | string[]) => void;
  addServer: () => void;
  removeServer: (index: number) => void;
  validateForm: () => Promise<DetailedValidationResult>;
  submitForm: () => Promise<boolean>;
  resetForm: () => void;
  loadProfile: (profileId: string) => Promise<void>;
  clearError: () => void;
}

export interface UseProfileFormResult extends ProfileFormState, ProfileFormActions {}

/**
 * Hook for managing profile form state and operations
 */
export function useProfileForm(
  mode: "create" | "edit" = "create",
  profileId?: string,
  onSuccess?: () => void,
): UseProfileFormResult {
  const profileManager = useProfileManager();
  const validationService = useValidationService();
  const notificationService = useNotificationService();

  const initialFormData: ProfileFormData = {
    name: "",
    description: "",
    servers: [{ name: "", command: "", args: [], envVars: "" }],
  };

  const [state, setState] = useState<ProfileFormState>({
    formData: initialFormData,
    isLoading: false,
    isSubmitting: false,
    error: null,
    validationResult: null,
    isDirty: false,
  });

  const [originalData, setOriginalData] = useState<ProfileFormData>(initialFormData);

  const updateField = useCallback((field: keyof ProfileFormData, value: ProfileFormData[keyof ProfileFormData]) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
      isDirty: true,
      error: null,
    }));
  }, []);

  const updateServer = useCallback((index: number, field: keyof MCPServerFormData, value: string | string[]) => {
    setState((prev) => {
      const updatedServers = [...prev.formData.servers];
      updatedServers[index] = { ...updatedServers[index], [field]: value };

      return {
        ...prev,
        formData: { ...prev.formData, servers: updatedServers },
        isDirty: true,
        error: null,
      };
    });
  }, []);

  const addServer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        servers: [...prev.formData.servers, { name: "", command: "", args: [], envVars: "" }],
      },
      isDirty: true,
    }));
  }, []);

  const removeServer = useCallback((index: number) => {
    setState((prev) => {
      if (prev.formData.servers.length <= 1) {
        return prev; // Don't remove the last server
      }

      const updatedServers = prev.formData.servers.filter((_, i) => i !== index);

      return {
        ...prev,
        formData: { ...prev.formData, servers: updatedServers },
        isDirty: true,
      };
    });
  }, []);

  const validateForm = useCallback(async (): Promise<DetailedValidationResult> => {
    try {
      // Convert form data to profile format for validation
      const profileData = await convertFormDataToProfile(state.formData);

      const validationResult =
        mode === "create"
          ? await validationService.validateProfileCreation(profileData)
          : await validationService.validateProfileUpdate(profileId!, profileData);

      setState((prev) => ({ ...prev, validationResult }));

      return validationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Validation failed";

      const validationResult: DetailedValidationResult = {
        valid: false,
        errors: [
          {
            severity: "error" as const,
            code: "VALIDATION_ERROR",
            message: errorMessage,
          },
        ],
        warnings: [],
        info: [],
      };

      setState((prev) => ({ ...prev, validationResult }));
      return validationResult;
    }
  }, [state.formData, mode, profileId, validationService]);

  const submitForm = useCallback(async (): Promise<boolean> => {
    if (state.isSubmitting) return false;

    try {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      // Validate form first
      const validationResult = await validateForm();
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map((e) => e.message).join(", ");
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      // Convert form data to appropriate format
      const profileData = await convertFormDataToProfile(state.formData);

      let result;
      if (mode === "create") {
        result = await profileManager.createProfile(profileData as CreateProfileInput);
      } else {
        result = await profileManager.updateProfile(profileId!, profileData as UpdateProfileInput);
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save profile");
      }

      // Reset dirty state and call success callback
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isDirty: false,
        error: null,
      }));

      setOriginalData(state.formData);
      onSuccess?.();

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save profile";

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage,
      }));

      await notificationService.showError("Form submission failed", errorMessage);
      return false;
    }
  }, [
    state.formData,
    state.isSubmitting,
    mode,
    profileId,
    profileManager,
    notificationService,
    validateForm,
    onSuccess,
  ]);

  const resetForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      formData: originalData,
      isDirty: false,
      error: null,
      validationResult: null,
    }));
  }, [originalData]);

  const loadProfile = useCallback(
    async (profileId: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const result = await profileManager.getProfile(profileId);
        if (!result.success || !result.data) {
          throw new Error(result.error || "Profile not found");
        }

        const profile = result.data;
        const formData = convertProfileToFormData(profile);

        setState((prev) => ({
          ...prev,
          formData,
          isLoading: false,
          isDirty: false,
          error: null,
        }));

        setOriginalData(formData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load profile";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        await notificationService.showError("Failed to load profile", errorMessage);
      }
    },
    [profileManager, notificationService],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load profile on mount if in edit mode
  useEffect(() => {
    if (mode === "edit" && profileId) {
      loadProfile(profileId);
    }
  }, [mode, profileId, loadProfile]);

  return {
    ...state,
    updateField,
    updateServer,
    addServer,
    removeServer,
    validateForm,
    submitForm,
    resetForm,
    loadProfile,
    clearError,
  };
}

/**
 * Convert form data to profile format
 */
async function convertFormDataToProfile(formData: ProfileFormData): Promise<Partial<MCPProfile>> {
  const mcpServers: { [key: string]: MCPServerConfig } = {};

  for (const server of formData.servers) {
    if (!server.name?.trim()) {
      throw new Error("All servers must have a name");
    }

    if (!server.command?.trim()) {
      throw new Error(`Server "${server.name}" requires a command`);
    }

    // Parse environment variables
    let env: Record<string, string> | undefined;
    if (server.envVars?.trim()) {
      try {
        env = JSON.parse(server.envVars);
        if (typeof env !== "object" || env === null) {
          throw new Error("Environment variables must be a valid JSON object");
        }
      } catch (error) {
        throw new Error(
          `Invalid environment variables for server "${server.name}": ${error instanceof Error ? error.message : "Invalid JSON"}`,
        );
      }
    }

    // Parse args (split by whitespace, preserving quoted strings)
    const args = server.args || [];
    const processedArgs =
      typeof args === "string"
        ? args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg) => arg.replace(/^"|"$/g, "")) || []
        : args;

    mcpServers[server.name] = {
      command: server.command,
      args: processedArgs,
      env,
    };
  }

  return {
    name: formData.name.trim(),
    description: formData.description?.trim() || undefined,
    mcpServers,
  };
}

/**
 * Convert profile to form data format
 */
function convertProfileToFormData(profile: MCPProfile): ProfileFormData {
  const servers: MCPServerFormData[] = Object.entries(profile.mcpServers).map(([name, config]) => ({
    name,
    command: config.command,
    args: config.args,
    envVars: config.env ? JSON.stringify(config.env, null, 2) : "",
  }));

  return {
    name: profile.name,
    description: profile.description || "",
    servers: servers.length > 0 ? servers : [{ name: "", command: "", args: [], envVars: "" }],
  };
}
