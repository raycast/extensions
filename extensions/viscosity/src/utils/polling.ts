export async function poll<T>(
  fn: () => Promise<T>,
  validate: (result: T) => boolean,
  interval = 1000,
  maxAttempts = 30,
): Promise<T | null> {
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, interval))
    const result = await fn()

    if (validate(result)) {
      return result
    }
  }
  return null
}
