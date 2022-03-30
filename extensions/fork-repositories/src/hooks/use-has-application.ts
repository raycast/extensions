import { useEffect, useRef, useState } from "react";
import { getApplications } from "@raycast/api";

const useHasApplication = (identifier: string): [boolean, boolean] => {
  const [state, setState] = useState<{ isLoading: boolean; isFound: boolean }>({ isLoading: true, isFound: false });
  const isMounted = useRef(true);

  useEffect(() => {
    (async () => {
      setState((previous) => ({ ...previous, isLoading: true }));

      const applications = await getApplications();

      let isFound = false;
      for (const application of applications) {
        if ([application.name, application.path, application.bundleId].includes(identifier)) {
          if (isMounted.current) {
            isFound = true;
          }
          break;
        }
      }

      if (!isMounted.current) {
        return;
      }

      setState({ isLoading: false, isFound });
    })();

    return function cleanup() {
      isMounted.current = false;
    };
  }, [identifier]);

  return [state.isFound, state.isLoading];
};

export { useHasApplication };
