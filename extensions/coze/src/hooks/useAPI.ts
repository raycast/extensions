import { useEffect, useState } from "react";
import initAPI, { APIInstance } from "../services/api";

const useAPI = (): {
  isLoading: boolean;
  api: APIInstance | undefined;
} => {
  const [isLoading, setIsLoading] = useState(true);
  const [api, setAPI] = useState<APIInstance | undefined>();

  useEffect(() => {
    const useAPI = async () => {
      try {
        const apiInstance = await initAPI();
        setAPI(apiInstance);
      } catch (error) {
        console.error("Failed to initialize API:", error);
      } finally {
        setIsLoading(false);
      }
    };

    useAPI();
  }, []);

  return {
    isLoading,
    api,
  };
};

export default useAPI;
