import { SendCreatePayload } from "~/types/send";

export function prepareSendPayload(template: SendCreatePayload, values: SendCreatePayload): SendCreatePayload {
  return {
    ...template,
    ...values,
  };
}
