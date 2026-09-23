import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

const tool = async () => {
  const response = await getResend().topics.list();
  return unwrapResponse(response, "list topics");
};

export default withResend(tool);
