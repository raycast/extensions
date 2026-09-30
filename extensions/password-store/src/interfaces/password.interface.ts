import { MutatePromise } from "@raycast/utils";

export interface Password {
  value: string;
  showOtpFirst?: boolean;
}

/** A type that contains props to pass for `InsertPasswordPrompt` and `GeneratePasswordPrompt` components  */
export interface PasswordMakerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPasswordCreate: MutatePromise<Password[], undefined, any>;
}

/** A type that contains props to pass for `RenamePasswordPrompt`  */
export interface RenamePasswordProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPasswordRename: MutatePromise<Password[], undefined, any>;
  oldName: string;
}

/** A type that represents the form value of `InsertPasswordForm` */
export interface InsertPasswordForm {
  passwordPath: string;
  password: string;
  metadata: string;
}
