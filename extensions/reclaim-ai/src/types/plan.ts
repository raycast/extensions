export type TaskPlanDetails = {
  id: string;
  userId: string;
  title: string;
  due?: string;
  durationTimeChunks: number;
  personal: boolean;
  snoozeUntil?: string;
};

export type SchedulingLinkPlanDetails = {
  id: string;
  title: string;
  slug: string;
  priority: boolean;
  ccs: [];
  durations: number[];
};

export interface Plan<PlanType extends TaskPlanDetails | SchedulingLinkPlanDetails> {
  planType: string;
  id: string;
  planDetails: PlanType;
}
