import { getEmailDomain } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useGetEmailDomain() {
  const [emailDomain, setEmailDomain] = useState<string>();
  const [isLoadingGetEmailDomain, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const emailDomain = await getEmailDomain();

        setEmailDomain(emailDomain);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get email domain fail");
      }
    })();
  }, []);

  return { emailDomain, isLoadingGetEmailDomain };
}
