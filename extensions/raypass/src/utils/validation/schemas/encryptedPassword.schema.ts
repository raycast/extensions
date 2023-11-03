import { object, string } from "yup";

export const encryptedPassword = object().shape({
  password: string().required("A password is required"),
});
