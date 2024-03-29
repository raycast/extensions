import { SendPayload } from "~/types/send";

export function prepareSendPayload(template: SendPayload, values: SendPayload): SendPayload {
  return {
    ...template,
    ...values,
  };
}
