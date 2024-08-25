import { useEffect, useState } from "react";
import { ExpiringCache } from "../utilities";

/**
 * A custom React hook that provides an instance of the ExpiringCache class.
 *
 * @returns A tuple containing the ExpiringCache instance or undefined if it hasn't been initialized yet.
 */
export function useExpiringCache<T>(): [ExpiringCache<T> | undefined] {
  /**
   * The state variable that holds the ExpiringCache instance.
   */
  const [cache, setCache] = useState<ExpiringCache<T> | undefined>(undefined);

  /**
   * The useEffect hook that initializes the ExpiringCache instance when the component mounts.
   */
  useEffect(() => setCache(new ExpiringCache<T>()), []);

  /**
   * Returns the ExpiringCache instance as a tuple, allowing the caller to access it.
   */
  return [cache];
}
