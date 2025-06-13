/**
 * Common test helper functions and utilities
 */

import { Preferences } from "../utils/common";

/**
 * Create mock preference values for testing
 */
export function mockPreferences(overrides?: Partial<Preferences>): Preferences {
  return {
    sonarqubePodmanDir: "/mock/sonarqube/dir",
    sonarqubeAppPath: "",
    sonarqubePort: "9000",
    ...overrides,
  };
}

/**
 * Mock implementation for Raycast's showToast function
 */
export function mockShowToast() {
  const mockToast = {
    title: "",
    message: "",
    style: "",
    primaryAction: undefined,
    secondaryAction: undefined,
  };

  const showToastMock = jest.fn().mockImplementation(() => {
    // Create a toast object with setters that update the mockToast reference
    const toastObj = {};

    // Define property setters that update mockToast
    Object.defineProperty(toastObj, "title", {
      set: (value: string) => {
        mockToast.title = value;
      },
    });

    Object.defineProperty(toastObj, "message", {
      set: (value: string) => {
        mockToast.message = value;
      },
    });

    Object.defineProperty(toastObj, "style", {
      set: (value: string) => {
        mockToast.style = value;
      },
    });

    return toastObj;
  });

  return {
    showToastMock,
    mockToast,
  };
}

/**
 * Create a mock Project object for testing
 */
export function createMockProject(overrides?: Partial<{ id: string; name: string; path: string }>) {
  return {
    id: "mock-project-id",
    name: "Mock Project",
    path: "/path/to/mock/project",
    ...overrides,
  };
}

/**
 * Create an array of mock projects for testing
 */
export function createMockProjects(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-project-${i}`,
    name: `Mock Project ${i}`,
    path: `/path/to/mock/project/${i}`,
  }));
}
