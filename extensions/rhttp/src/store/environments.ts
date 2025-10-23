// src/store/environments.ts
import { randomUUID } from "node:crypto";
import { createLocalStorageAdapter, persistentAtom } from "zod-persist";
import { Environment, environmentsSchema, Variable } from "~/types";
import { LocalStorage, showToast, Toast } from "@raycast/api";

export const $environments = persistentAtom([], {
  storage: createLocalStorageAdapter(LocalStorage),
  key: "env",
  schema: environmentsSchema,
  onCorruption: async (error) => {
    console.error(error);
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to load environments",
      message: "Data was corrupted. A backup was created and defaults have been restored.",
    });
    return [];
  },
});

// This will store the ID of the currently active environment
export const $currentEnvironmentId = persistentAtom<string | null>(null, {
  storage: createLocalStorageAdapter(LocalStorage),
  key: "app-active-environment-id",
});

/**
 * Checks if the environment store is empty on startup and creates
 * a default "default" environment if needed.
 */
export async function initializeDefaultEnvironment() {
  await $environments.ready;
  const environments = $environments.get();

  if (environments.length === 0) {
    const defaultEnv = {
      id: randomUUID(),
      name: "default",
      variables: {},
    };
    try {
      await $environments.setAndFlush([defaultEnv]);
      await $currentEnvironmentId.setAndFlush(defaultEnv.id);
    } catch (error) {
      console.error("Failed to initialize default environment:", error);
      throw error;
    }
  }
}

// --- INITIALIZATION ---

// Run the initialization logic once when the app starts.
initializeDefaultEnvironment().catch(console.error);

// --- ACTIONS ---

/**
 * Creates a new, empty environment.
 * @param name The name for the new environment (e.g., "Production").
 */
export async function createEnvironment(name: string) {
  const newEnvironment: Environment = {
    id: randomUUID(),
    name,
    variables: {},
  };
  const newState = [...$environments.get(), newEnvironment];
  environmentsSchema.parse(newState);
  await $environments.setAndFlush(newState);

  await $currentEnvironmentId.setAndFlush(newEnvironment.id);
}

/**
 * Updates an environment's properties (e.g., renaming it).
 * @param environmentId The ID of the environment to update.
 * @param data The partial data to update (e.g., `{ name: "New Name" }`).
 */
export async function updateEnvironment(environmentId: string, data: Partial<Environment>) {
  const updated = $environments.get().map((env) => (env.id === environmentId ? { ...env, ...data } : env));
  environmentsSchema.parse(updated);
  await $environments.setAndFlush(updated);
}

/**
 * Deletes an entire environment.
 * @param environmentId The ID of the environment to delete.
 */
export async function deleteEnvironment(environmentId: string) {
  const updated = $environments.get().filter((env) => env.id !== environmentId);
  environmentsSchema.parse(updated);
  await $environments.setAndFlush(updated);

  // If the deleted environment was the active one, clear the active selection.
  if ($currentEnvironmentId.get() === environmentId) {
    await $currentEnvironmentId.setAndFlush(null);
  }
}

// --- VARIABLE ACTIONS ---

/**
 * Creates or updates a variable within a specific environment.
 * @param environmentId The ID of the environment that holds the variable.
 * @param key The key of the variable (e.g., "baseUrl").
 * @param variableData The variable object, including its value and isSecret flag.
 */
export async function saveVariable(environmentId: string, key: string, variableData: Variable) {
  const updated = $environments.get().map((env) => {
    if (env.id === environmentId) {
      // Save the entire variable object, not just the value string
      const newVariables = { ...env.variables, [key]: variableData };
      return { ...env, variables: newVariables };
    }
    return env;
  });

  environmentsSchema.parse(updated);

  await $environments.setAndFlush(updated);
}

/**
 * Deletes a variable from a specific environment.
 * @param environmentId The ID of the environment that holds the variable.
 * @param key The key of the variable to delete.
 */
export async function deleteVariable(environmentId: string, key: string) {
  const updated = $environments.get().map((env) => {
    if (env.id === environmentId) {
      const remainingVars = Object.fromEntries(Object.entries(env.variables).filter(([k]) => k !== key));
      return { ...env, variables: remainingVars };
    }
    return env;
  });
  environmentsSchema.parse(updated);
  await $environments.setAndFlush(updated);
}

/**
 * Creates or updates a variable in the currently active environment.
 * @param key The key of the variable.
 * @param value The value to save.
 */
export async function saveVariableToActiveEnvironment(key: string, value: string) {
  const activeId = $currentEnvironmentId.get();
  if (!activeId) {
    return;
  }

  // For simplicity, we'll mark dynamically saved variables as non-secret by default.
  const variableData: Variable = {
    value,
    isSecret: false,
  };

  await saveVariable(activeId, key, variableData);
}
