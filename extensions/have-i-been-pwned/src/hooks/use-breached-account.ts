import { useEffect, useState } from "react";
import { getBreachedAccount } from "../utils/breaches";
import { Breach } from "../utils/types";
import { isValidEmail } from "../utils/email-validator";
import { HibpError } from "../utils/api";
import { addToHistory } from "../utils/history";

export const useBreachedAccount = (email: string) => {
  const [breaches, setBreaches] = useState<Breach[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  useEffect(() => {
    const fetchBreaches = async () => {
      if (!isValidEmail(email)) {
        setErrorText("Invalid email address.");
        return;
      }

      setIsLoading(true);
      try {
        const result = await getBreachedAccount(email);
        const breachList = result ?? [];
        setBreaches(breachList);
        addToHistory({ kind: "email", email, breaches: breachList, timestamp: Date.now() });
      } catch (err) {
        if (err instanceof HibpError && (err.statusCode === 401 || err.statusCode === 403)) {
          setNeedsApiKey(true);
        }
        setErrorText((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreaches();
  }, [email]);

  return { breaches, isLoading, errorText, needsApiKey };
};
