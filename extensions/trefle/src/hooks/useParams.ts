import { useMemo } from "react";
import { PlantsApiAxiosParamCreator } from "@/api/trefle";
import { getConfiguration } from "@/api";

const useParams = () => {
  const configuration = useMemo(() => {
    return getConfiguration();
  }, []);
  const paramsCreator = useMemo(() => {
    return PlantsApiAxiosParamCreator(configuration);
  }, [configuration]);

  return paramsCreator;
};

export default useParams;
