import { SchedulingLinkPlanDetails, TaskPlanDetails } from "../types/plan";
import { fetchPromise } from "../utils/fetcher";
import { ApiResponseInterpreter } from "./useInterpreter.types";

const useInterpreter = () => {
  const sendToInterpreter = async <T extends TaskPlanDetails | SchedulingLinkPlanDetails>(
    category: string,
    message: string
  ) => {
    try {
      const data = {
        message,
        category,
      };

      const [response, error] = await fetchPromise<ApiResponseInterpreter<T>>("/interpreter/message", {
        init: { method: "POST" },
        payload: data,
      });
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
