import { useEffect, useState } from "react";
import { checkPasswordHash, hashPassword } from "../utils/passwords";
import { addToHistory } from "../utils/history";

export const usePwnedPassword = (password: string) => {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchPwnedPassword = async () => {
      setErrorText(null);
      setCount(null);
      setIsLoading(true);

      try {
        const sha1 = hashPassword(password);
        const result = await checkPasswordHash(sha1);
        if (isCancelled) return;

        setCount(result);
        const sha1Prefix = sha1.slice(0, 5);
        await addToHistory({ kind: "password", sha1Prefix, count: result, timestamp: Date.now() });
      } catch (err) {
        if (isCancelled) return;

        setErrorText((err as Error).message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchPwnedPassword();
    return () => {
      isCancelled = true;
    };
  }, [password]);

  return { count, isLoading, errorText };
};
