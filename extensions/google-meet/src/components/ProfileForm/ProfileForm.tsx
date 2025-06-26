import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { GoogleProfile, useCacheHelpers } from "../../hooks";

type ProfileFormProps = { onFinish: () => void };

export const ProfileForm = ({ onFinish }: ProfileFormProps) => {
  const { onStoreData } = useCacheHelpers();

  const { handleSubmit, itemProps } = useForm<GoogleProfile>({
    onSubmit(values) {
      try {
        onStoreData(values);
        onFinish();

        showToast({
          style: Toast.Style.Success,
          title: "Profile created!",
        });
      } catch (err) {
        showFailureToast(err, { title: "Profile already exists!" });
      }
      showToast({
        style: Toast.Style.Failure,
        title: "Profile already exists!",
      });
    },
    validation: {
      name: FormValidation.Required,
      email: (value) => {
        const regexp =
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

        if (!value) {
          return "The item is required";
        }

        if (!regexp.test(value)) {
          return "You need a valid email address";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add profile" onSubmit={handleSubmit} />
          <Action.SubmitForm title="Back" onSubmit={onFinish} />
        </ActionPanel>
      }
    >
      <Form.TextField
        autoFocus
        info="It's important that the email is the same as the one you are logged in on your default browser!"
        placeholder="john.doe@raycast.com"
        title="Profile email *"
        {...itemProps.email}
      />
      <Form.TextField placeholder="Raycast" title="Profile name *" {...itemProps.name} />
    </Form>
  );
};
