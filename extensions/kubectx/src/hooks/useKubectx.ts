import { closeMainWindow, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";

import kubectxService from "../services/kubectx.service";

const useKubectx = () => {
  const [loading, setLoading] = useState(true);
  const [contextes, setContextes] = useState<string[]>([]);
  const [currentContext, setCurrrentContext] = useState<string>();

  const getData = async () => {
    try {
      const allContextes = await kubectxService.getAllContextes();
      const _currentContext = await kubectxService.getCurrentContext();

      setContextes(allContextes);
      setCurrrentContext(_currentContext);
    } catch (e) {
      showToast(ToastStyle.Failure, "An error occurred", "Please make sure you have installed kubectx correctly");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const switchContext = async (newContextName: string) => {
    try {
      await kubectxService.switchContext(newContextName);
      setCurrrentContext(newContextName);
      await closeMainWindow();
    } catch (e) {
      showToast(ToastStyle.Failure, "An error occurred");
    }
  };

  return { loading, contextes, currentContext, switchContext };
};

export default useKubectx;
