import React, { useState, useEffect, ReactNode } from "react";
import { Detail, showToast, Toast } from "@raycast/api";
import * as google from "../api/oauth";

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await google.authorize();
      } catch (err) {
        console.error("Google auth error:", err);
        const errorMessage = String(err);
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Authentication Failed\n\n${error}\n\nPlease check your OAuth credentials in extension preferences.`}
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading />;
  }

  return <React.Fragment>{children}</React.Fragment>;
}
