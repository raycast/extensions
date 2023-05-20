// wrap expensive function with memoization to fasten the initial load
export function memoizeLast<R, T extends () => R>(fn: T): T {
  let invoked = false
  let lastResult: R | undefined
  return (() => {
    if (!invoked) {
      invoked = true
      return (lastResult = fn()) as R
    }
    return lastResult as R
  }) as T
}

export function sleep(duration = 100) {
  return new Promise((resolve) => {
    return setTimeout(resolve, duration)
  })
}
