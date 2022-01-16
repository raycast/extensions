import { useState, useEffect } from "react";
import { getApplications } from "@raycast/api";

const useHasApplication = (identifier: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFound, setIsFound] = useState(false);

  useEffect(() => {
    getApplications().then((applications) => {
      for (const application of applications) {
        if ([application.name, application.path, application.bundleId].includes(identifier)) {
          setIsFound(true);
          break;
        }
      }
      setIsLoading(false);
    });
  }, [identifier]);

  return [isLoading, isFound];
};

export { useHasApplication };
