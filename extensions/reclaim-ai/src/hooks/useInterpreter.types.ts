import { Plan, SchedulingLinkPlanDetails, TaskPlanDetails } from "../types/plan";

export type ApiResponseInterpreter<T extends TaskPlanDetails | SchedulingLinkPlanDetails> = {
  interpretedPlans: Plan<T>[];
};
