/**
 * Mocks for SonarQube related functions
 */

// Mock implementation for isSonarQubeRunning
export const mockIsSonarQubeRunning = jest.fn();

// Mock for running status
export function mockSonarQubeRunning() {
  mockIsSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
    if (options?.detailed) {
      return {
        running: true,
        status: "running",
        details: "SonarQube is running normally",
      };
    }
    return true;
  });
}

// Mock for not running status
export function mockSonarQubeNotRunning() {
  mockIsSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
    if (options?.detailed) {
      return {
        running: false,
        status: "down",
        details: "SonarQube server is not running",
      };
    }
    return false;
  });
}

// Mock for starting status
export function mockSonarQubeStarting() {
  mockIsSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
    if (options?.detailed) {
      return {
        running: false,
        status: "starting",
        details: "SonarQube server is still starting up",
      };
    }
    return false;
  });
}

// Mock for timeout status
export function mockSonarQubeTimeout() {
  mockIsSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
    if (options?.detailed) {
      return {
        running: false,
        status: "timeout",
        details: "SonarQube server is not responding (may be starting)",
      };
    }
    return false;
  });
}

// Mock for error status
export function mockSonarQubeError(errorMessage: string = "Unknown error") {
  mockIsSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
    if (options?.detailed) {
      return {
        running: false,
        status: "error",
        details: `Error checking SonarQube: ${errorMessage}`,
      };
    }
    return false;
  });
}
