import { object, string } from "yup";

import totp from "totp-generator";

export const newRecord = object().shape({
  name: string().required("The field should't be empty!"),
  username: string().optional(),
  email: string().email("Invalid email address!").optional(),
  password: string().required("The field should't be empty!"),
  secret: string()
    .optional()
    .test({
      name: "is-totp",
      test: (value) => {
        try {
          totp(value as string);
          return true;
        } catch (_) {
          return false;
        }
      },
    }),
  url: string().url("Invalid URL!").optional(),
  notes: string().optional(),
});
