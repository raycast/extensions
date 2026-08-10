import { useEffect, useState } from "react";
import { initGlobalProjectInfo } from "../service/project";

const useStartApp = () => {
  const [isInitCompleted, setIsInitCompleted] = useState(false);

  useEffect(() => {
    const startApp = async () => {
      await Promise.all([initGlobalProjectInfo()]);
      setIsInitCompleted(true);
    };

    startApp();
  }, []);

  return { isInitCompleted };
};

export default useStartApp;
