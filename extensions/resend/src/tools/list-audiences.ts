import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

const tool = async () => {
  const response = await getResend().segments.list();
  return unwrapResponse(response, "list audiences");
};

export default withResend(tool);
