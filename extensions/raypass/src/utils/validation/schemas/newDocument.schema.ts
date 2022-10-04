import { object, string, bool } from "yup";

export const newDocument = object().shape({
  name: string()
    .required("A document name is required.")
    .matches(/^[^\W_]+$/, "Document name should only contain letters and numbers."),
  encrypted: bool().required("A document encryption status is required."),
  password: string().required("A password is required").min(8, "Password should be at least 8 characters."),
});
