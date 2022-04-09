import { ActionType } from "./move-file-utils";
import { commonAction } from "./move-file-out";

export default async () => {
  await commonAction(ActionType.copy);
};
