import { SendCreatePayload } from "~/types/send";

export function prepareSendPayload(template: SendCreatePayload, values: SendCreatePayload): SendCreatePayload {
  return {
    ...template,
    ...values,
    file: values.file ? { ...template.file, ...values.file } : template.file,
    text: values.text ? { ...template.text, ...values.text } : template.text,
  };
}
