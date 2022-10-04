import { object, string } from "yup";

export const newRecord = object().shape({
  name: string().required("The field should't be empty!"),
  username: string().optional(),
  email: string().email("Invalid email address!").optional(),
  password: string().required("The field should't be empty!"),
  url: string().url("Invalid URL!").optional(),
  notes: string().optional(),
});
