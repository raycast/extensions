type TaskPlanDetails = {
  id: string;
  userId: string;
  title: string;
  due: string;
  durationTimeChunks: number;
  personal: boolean;
  snoozeUntil: string;
};

export interface Plan {
  planType: string;
  id: string;
  // description: string;
  planDetails: TaskPlanDetails;
}
