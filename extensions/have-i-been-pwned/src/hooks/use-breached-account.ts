import { useEffect, useState } from "react";
import { getBreachedAccount } from "../utils/breaches";
import { Breach } from "../utils/types";
import { isValidEmail } from "../utils/email-validator";
import { HibpError } from "../utils/api";
import { addToHistory } from "../utils/history";

export const useBreachedAccount = (email: string) => {
  const [breaches, setBreaches] = useState<Breach[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchBreaches = async () => {
      setErrorText(null);
      setNeedsApiKey(false);
      setBreaches(null);

      if (!isValidEmail(email)) {
        setIsLoading(false);
        setErrorText("Invalid email address.");
        return;
      }

      setIsLoading(true);
      try {
        const result = await getBreachedAccount(email);
        if (isCancelled) return;

        const breachList = result ?? [];
        setBreaches(breachList);
        await addToHistory({ kind: "email", email, breaches: breachList, timestamp: Date.now() });
      } catch (err) {
        if (isCancelled) return;

        if (err instanceof HibpError && (err.statusCode === 401 || err.statusCode === 403)) {
          setNeedsApiKey(true);
        }
        setErrorText((err as Error).message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchBreaches();
    return () => {
      isCancelled = true;
    };
  }, [email]);

  return { breaches, isLoading, errorText, needsApiKey };
};
