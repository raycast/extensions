import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import kubensService from "./kubens.service";

const useKubens = () => {
  const [loading, setLoading] = useState(true);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [currentNamespace, setCurrrentNamespace] = useState<string>();

  const getData = async () => {
    try {
      const allNamespaces = await kubensService.getAllNamespaces();
      const _currentNamespace = await kubensService.getCurrentNamespace();

      setNamespaces(allNamespaces);
      setCurrrentNamespace(_currentNamespace);
    } catch (e) {
      showToast(Toast.Style.Failure, "An error occurred", "Please make sure you have installed kubens correctly");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const switchNamespace = async (newNamespaceName: string) => {
    try {
      await kubensService.switchNamespace(newNamespaceName);
      setCurrrentNamespace(newNamespaceName);
      await closeMainWindow();
    } catch (e) {
      showToast(Toast.Style.Failure, "An error occurred");
    }
  };

  return { loading, namespaces, currentNamespace, switchNamespace };
};

export default useKubens;
