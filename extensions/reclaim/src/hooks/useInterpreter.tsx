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

  // const confirmInterpreterMessage = async (planUuid: string) => {
  //   try {
  //     const rawRequest = await fetcher(`/interpreter/plans/applied/${planUuid}`, {
  //       method: "POST",
  //     });
  //     return { statusCode: rawRequest.status };
  //   } catch (error) {
  //     console.error("Error while confirming interpreter message", error);
  //   }
  // };

  return {
    sendToInterpreter,
    // confirmInterpreterMessage,
  };
};

export default useInterpreter;
