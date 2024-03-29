import { SendPayload } from "~/types/send";

export function prepareSendPayload(template: SendPayload, values: SendPayload) {
  return {
    ...template,
    ...values,
  };
}
