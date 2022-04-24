type actionBoundaryT = {
  <T extends (...args: any[]) => ReturnType<T>>(
    fn: T,
    setError?: React.Dispatch<React.SetStateAction<boolean>>,
  ): (...args: Parameters<T>) => Promise<void>
}

const actionBoundary: actionBoundaryT =
  (fn, setError) =>
  async (...args) => {
    try {
      await fn(...args)
    } catch (e) {
      setError && setError(true)
    }
  }

export default actionBoundary
