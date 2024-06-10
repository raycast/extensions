import { useMemo } from "react";
import { getConfiguration } from "@/lib";
import { PlantsApiAxiosParamCreator } from "@/api";

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
