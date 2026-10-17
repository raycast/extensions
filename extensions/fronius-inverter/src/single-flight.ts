export function createSingleFlight<Result>(operation: () => Promise<Result>): () => Promise<Result> {
  let active: Promise<Result> | undefined;

  return () => {
    if (active) return active;

    let request: Promise<Result>;
    try {
      request = operation();
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
