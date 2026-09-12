import { AxiosRequestConfig } from "axios";
import { useEffect, useState } from "react";
import Axios from "./caller.service";

export const useAxiosFetch = (params: AxiosRequestConfig<any>) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async (): Promise<any> => {
    setError("");
    setLoading(true);
    return Axios.request(params)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return [data, error, loading, fetchData] as const;
};
