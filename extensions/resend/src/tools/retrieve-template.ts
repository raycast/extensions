import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The template ID or alias. Get it from list-templates. */
  templateId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().templates.get(input.templateId);
  return unwrapResponse(response, "retrieve template");
};

export default withResend(tool);
