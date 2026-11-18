import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useCacheHelpers } from "../../hooks";
import { profileLaunchTargetChoices, toLaunchTarget } from "../launch-target-options";

type ProfileFormProps = { onFinish: () => void };

type ProfileFormValues = {
  name: string;
  email: string;
  launchTarget: string;
};

const emailRegex =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function validateEmail(value?: string) {
  if (!value) {
    return "The item is required";
  }

  if (!emailRegex.test(value)) {
    return "You need a valid email address";
  }
}

export const ProfileForm = ({ onFinish }: ProfileFormProps) => {
  const { onStoreData } = useCacheHelpers();

  const { handleSubmit, itemProps } = useForm<ProfileFormValues>({
    initialValues: { launchTarget: "default" },
    onSubmit({ name, email, launchTarget }) {
      try {
        onStoreData({ name, email, launchTarget: toLaunchTarget(launchTarget) });
        onFinish();

        showToast({
          style: Toast.Style.Success,
          title: "Profile created!",
        });
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Profile already exists!",
        });
      }
    },
    validation: {
      name: FormValidation.Required,
      email: validateEmail,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Profile" onSubmit={handleSubmit} />
          <Action.SubmitForm title="Back" onSubmit={onFinish} />
        </ActionPanel>
      }
    >
      <Form.TextField
        autoFocus
        info="Use an account that's signed in wherever this profile's meetings open: your browser, or the Google Meet PWA."
        placeholder="john.doe@raycast.com"
        title="Profile email *"
        {...itemProps.email}
      />
      <Form.TextField placeholder="Raycast" title="Profile name *" {...itemProps.name} />
      <Form.Dropdown
        title="Open In"
        info="Where this profile's meetings open. Use Extension Setting follows the Open Meetings In preference."
        {...itemProps.launchTarget}
      >
        {profileLaunchTargetChoices.map(({ value, title }) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
