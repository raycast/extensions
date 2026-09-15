export function createSingleFlight<Arguments extends unknown[], Result>(
  operation: (...arguments_: Arguments) => Promise<Result>,
): (...arguments_: Arguments) => Promise<Result> {
  let active: Promise<Result> | undefined;

  return (...arguments_: Arguments) => {
    if (active) return active;

    let request: Promise<Result>;
    try {
      request = operation(...arguments_);
    } catch (error) {
      return Promise.reject(error);
    }

    active = request.then(
      (result) => {
        active = undefined;
        return result;
      },
      (error) => {
        active = undefined;
        throw error;
      },
    );
    return active;
  };
}
