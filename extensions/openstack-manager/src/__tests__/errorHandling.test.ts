// Feature: openstack-manager, Property 13: CLI error handler produces Toast containing the error text

import * as fc from "fast-check";
import { showToast } from "@raycast/api";
import { CLIError } from "../core/errors";
import { BaseService } from "../services/BaseService";
import { CLIExecutor } from "../core/CLIExecutor";
import { ResourceCache } from "../core/ResourceCache";
import { ConfigManager } from "../config/ConfigManager";

// Cast the mock so we can inspect calls
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

/**
 * Concrete subclass of BaseService for testing purposes.
 * Exposes the protected handleCLIError method.
 */
class TestService extends BaseService {
  public callHandleCLIError(error: CLIError, context: string): void {
    this.handleCLIError(error, context);
  }
}

describe("BaseService - Property 13: CLI error handler produces Toast containing the error text", () => {
  let service: TestService;

  beforeEach(() => {
    mockShowToast.mockClear();

    // Create service with dummy dependencies — we only test handleCLIError
    const cli = {} as CLIExecutor;
    const cache = new ResourceCache();
    const configManager = {} as ConfigManager;
    service = new TestService(cli, cache, configManager);
  });

  // **Validates: Requirements 11.1**
  it("for any non-zero exit code and non-empty stderr, the Toast message contains the stderr text", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 255 }),
        fc.string({ minLength: 1 }),
        async (exitCode: number, stderr: string) => {
          mockShowToast.mockClear();

          const error = new CLIError(stderr, exitCode, stderr, ["test"]);
          service.callHandleCLIError(error, "Test operation");

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toastOptions = mockShowToast.mock.calls[0][0] as any;
          expect(toastOptions.message).toContain(stderr);
        },
      ),
      { numRuns: 100 },
    );
  });
});
