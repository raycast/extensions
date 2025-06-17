/**
 * Mocks for terminal-related functions
 */

// Mock for execAsync function
export const mockExecAsync = jest.fn();

// Mock successful execution
export function mockExecAsyncSuccess(stdout: string = "", stderr: string = "") {
  mockExecAsync.mockResolvedValue({ stdout, stderr });
}

// Extended Error interface for exec errors
interface ExecError extends Error {
  stderr?: string;
}

// Mock execution failure
export function mockExecAsyncFailure(error: string = "Command failed") {
  const mockError = new Error(error) as ExecError;
  mockError.stderr = error;
  mockExecAsync.mockRejectedValue(mockError);
}

// Mock for runCommand function
export const mockRunCommand = jest
  .fn()
  .mockImplementation(async (command: string, success: (value: string) => void) => {
    success("Command executed successfully");
    return { success: true, message: "Command executed successfully" };
  });

// Mock for runInNewTerminal function
export const mockRunInNewTerminal = jest
  .fn()
  .mockImplementation(async (commands: string[], success: (value: string) => void) => {
    success("Commands executed successfully");
    return { success: true, message: "Commands executed successfully" };
  });
