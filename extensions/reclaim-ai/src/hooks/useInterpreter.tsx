import { SchedulingLinkPlanDetails, TaskPlanDetails } from "../types/plan";
import { axiosPromiseData } from "../utils/axiosPromise";
import useApi from "./useApi";
import { ApiResponseInterpreter } from "./useInterpreter.types";

const useInterpreter = () => {
  const { fetcher } = useApi();

  const sendToInterpreter = async <T extends TaskPlanDetails | SchedulingLinkPlanDetails>(
    category: string,
    message: string
  ) => {
    try {
      const data = {
        message,
        category,
      };

      const [response, error] = await axiosPromiseData<ApiResponseInterpreter<T>>(
        fetcher("/interpreter/message", {
          method: "POST",
          data,
        })
      );
      if (!response || error) throw error;

      return response.interpretedPlans;
    } catch (error) {
      console.error("Error while sending message to interpreter", error);
    }
  };

  return {
    sendToInterpreter,
  };
};

export default useInterpreter;
