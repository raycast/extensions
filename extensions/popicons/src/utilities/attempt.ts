/**
 * Represents an action that yields a result of type `T`.
 */
type Action<T> = () => T;

type Result<T, F> = T extends Promise<infer U> ? Promise<U | F> : T | F;

/**
 * Utility class for safe execution of actions with optional fallback handling for errors.
 */
class Attempt<T, F = undefined> {
  constructor(private readonly action: Action<T>, private readonly fallbackHandler?: (e: unknown) => F) {}

  /**
   * Executes the action
   *
   * @remark If an fallback is provided, it will be executed in case of an error and return its result.
   */
  public run(): Result<T, F> {
    try {
      const result = this.action();

      if (result instanceof Promise) {
        return this.resolve(result) as Result<T, F>;
      }

      return result as Result<T, F>;
    } catch (err) {
      return this.handleError(err) as Result<T, F>;
    }
  }

  private async resolve(promise: Promise<T>) {
    try {
      return await promise;
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleError(err: unknown) {
    if (this.fallbackHandler) {
      return this.fallbackHandler(err);
    }

    return undefined as F;
  }

  /**
   * Sets the fallback handler
   */
  public fallback<G>(handler: (e: unknown) => G) {
    return new Attempt(this.action, handler);
  }
}

/**
 * Creates a new `Attempt` to execute the action.
 *
 * Use the `fallback` method to set a fallback handler and `conduct` or `conductAsync`
 * to execute the action.
 */
function attempt<T>(action: Action<T>) {
  return new Attempt(action);
}

export { attempt };
