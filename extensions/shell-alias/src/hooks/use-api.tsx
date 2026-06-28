import { useState } from "react";
import { api } from "../api/api";
import { UnsupportedShellError } from "../api/shell/errors/unsupported-shell.error";
import UnsupportedShellFeedback from "../components/unsupported-shell-feedback";

export default function useApi() {
  const [isShellSupported, setIsShellSupported] = useState(true);

  const apiProxy = new Proxy(api, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      return (...args: unknown[]) => {
        try {
          return orig.apply(target, args);
        } catch (error) {
          if (error instanceof UnsupportedShellError) {
            setIsShellSupported(false);
            return;
          }
          throw error;
        }
      };
    },
  });

  const renderIfShellSupported = (children: React.ReactNode) => {
    if (isShellSupported) {
      return children;
    }
    return <UnsupportedShellFeedback />;
  };

  return {
    api: apiProxy,
    renderIfShellSupported,
  };
}
