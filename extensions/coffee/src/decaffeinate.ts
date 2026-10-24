import { stopCaffeinate, prepareUserStop } from "./utils";

export default async () => {
  const decision = await prepareUserStop();
  if (!decision.allowed) return;
  await stopCaffeinate({ menubar: true, status: true }, true, {
    pauseRunningSchedule: decision.pauseRunningSchedule,
  });
};
