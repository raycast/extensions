import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { errorMessage } from "../lib/showmd";

// Shared load/catch/toast/finally shape behind the various commands' refresh
// functions: run an async action, surface a failure toast if it throws, and
// track isLoading around it.
export function useToastLoader(failTitle: string) {
  const [isLoading, setIsLoading] = useState(true);

  async function run(action: () => Promise<void>): Promise<void> {
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: failTitle,
        message: errorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, setIsLoading, run };
}
