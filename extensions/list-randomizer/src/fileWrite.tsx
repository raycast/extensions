import { environment } from "@raycast/api";
import fs from "fs";

export const LIST_HISTORY = `${environment.supportPath}/list_history.txt`;
const getInitialValue = () => {
  try {
    const storedItemsBuffer = fs.readFileSync(LIST_HISTORY);
    return storedItemsBuffer.toString();
  } catch (error) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }
};

export { getInitialValue };
