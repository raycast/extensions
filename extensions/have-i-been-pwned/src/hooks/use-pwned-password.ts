import { useEffect, useState } from "react";
import { checkPassword, hashPassword } from "../utils/passwords";
import { addToHistory } from "../utils/history";

export const usePwnedPassword = (password: string) => {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const fetchPwnedPassword = async () => {
      setIsLoading(true);
      try {
        const result = await checkPassword(password);
        setCount(result);
        const sha1Prefix = hashPassword(password).slice(0, 5);
        addToHistory({ kind: "password", sha1Prefix, count: result, timestamp: Date.now() });
      } catch (err) {
        setErrorText((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPwnedPassword();
  }, [password]);

  return { count, isLoading, errorText };
};
