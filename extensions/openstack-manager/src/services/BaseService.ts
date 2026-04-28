import { showToast, Toast } from "@raycast/api";
import { CLIExecutor } from "../core/CLIExecutor";
import { ResourceCache } from "../core/ResourceCache";
import { ConfigManager } from "../config/ConfigManager";
import { CLIError } from "../core/errors";

/**
 * Abstract base class for all OpenStack resource services.
 *
 * Provides CLI execution and consistent error handling.
 * Caching is handled at the view layer via useFetchWithCache hook.
 */
export abstract class BaseService {
  constructor(
    protected readonly cli: CLIExecutor,
    protected readonly cache: ResourceCache,
    protected readonly configManager: ConfigManager,
  ) {}

  /**
   * Fetches data from the CLI. No caching at this layer —
   * caching is handled by the useFetchWithCache hook in the views.
   */
  protected async fetchData<T>(args: string[]): Promise<T> {
    return this.cli.run<T>(args);
  }

  /**
   * Handles a CLIError by showing a failure Toast and logging to console.
   */
  protected handleCLIError(error: CLIError, context: string): void {
    const message = error.stderr || error.message;
    console.error(`[${context}]`, message, { exitCode: error.exitCode, args: error.args });

    showToast({
      style: Toast.Style.Failure,
      title: context,
      message,
    });
  }
}
