import React, { useState, useEffect } from "react";
import { Detail } from "@raycast/api";
import * as google from "./api/oauth";
import CreateContactForm from "./components/CreateContactForm";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  // Authorize with Google first
  useEffect(() => {
    (async () => {
      try {
        await google.authorize();
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} markdown="Authorizing with Google..." />;
  }

  // Show the create contact form
  return <CreateContactForm />;
}
