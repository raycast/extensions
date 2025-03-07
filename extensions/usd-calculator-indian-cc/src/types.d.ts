declare module "@raycast/api" {
  import { ReactElement } from "react";

  // Form Components
  export const Form: React.FC<FormProps> & {
    TextField: React.FC<FormTextFieldProps>;
    Description: React.FC<FormDescriptionProps>;
  };

  export interface FormProps {
    children: ReactElement | ReactElement[];
    actions?: ReactElement;
    isLoading?: boolean;
  }

  export interface FormTextFieldProps {
    id: string;
    title: string;
    placeholder?: string;
  }

  export interface FormDescriptionProps {
    text: string;
  }

  // Action Components
  export const ActionPanel: React.FC<ActionPanelProps>;

  export const Action: {
    SubmitForm: React.FC<ActionSubmitFormProps<any>>;
  };

  export interface ActionPanelProps {
    children: ReactElement | ReactElement[];
  }

  export interface ActionSubmitFormProps<T> {
    title: string;
    onSubmit: (values: T) => Promise<void>;
  }

  // Toast
  export const Toast: {
    Style: {
      Success: "success";
      Failure: "failure";
    };
  };

  export interface ToastOptions {
    style: (typeof Toast.Style)[keyof typeof Toast.Style];
    title: string;
    message?: string;
  }

  export function showToast(options: ToastOptions): Promise<void>;

  // Clipboard
  export const Clipboard: {
    copy(text: string): Promise<void>;
  };
}
