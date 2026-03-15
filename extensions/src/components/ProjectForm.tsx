import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import { ProjectInput, StripeProject } from "../lib/types";

type ProjectFormProps = {
  onDidSave: (input: ProjectInput) => Promise<StripeProject> | StripeProject;
};

type FormValues = {
  name: string;
  secretKey: string;
  dashboardUrl: string;
};

export function ProjectForm(props: ProjectFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [secretKeyError, setSecretKeyError] = useState<string | undefined>();
  const [dashboardUrlError, setDashboardUrlError] = useState<
    string | undefined
  >();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    const projectInput: ProjectInput = {
      name: values.name.trim(),
      secretKey: values.secretKey.trim(),
      dashboardUrl: values.dashboardUrl.trim(),
    };

    let hasError = false;

    if (!projectInput.name) {
      setNameError("Enter a project name.");
      hasError = true;
    }

    if (!projectInput.secretKey.startsWith("sk_")) {
      setSecretKeyError("Stripe secret keys should start with sk_.");
      hasError = true;
    }

    if (
      projectInput.dashboardUrl &&
      !projectInput.dashboardUrl.startsWith("https://dashboard.stripe.com")
    ) {
      setDashboardUrlError("Use a Stripe dashboard URL.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving Stripe project...",
      });
      const project = await props.onDidSave(projectInput);

      toast.style = Toast.Style.Success;
      toast.title = `Saved ${project.name}`;
      toast.message = "Type rev to see your snapshot.";

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save project",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Connect Stripe"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Stored securely on your device. Add one Stripe project now and we’ll use it as the active project." />
      <Form.TextField
        id="name"
        title="Project Name"
        placeholder="Project Alpha"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.PasswordField
        id="secretKey"
        title="Stripe Secret Key"
        placeholder="sk_live_..."
        error={secretKeyError}
        onChange={() => setSecretKeyError(undefined)}
      />
      <Form.TextField
        id="dashboardUrl"
        title="Dashboard URL"
        placeholder="Optional"
        info="Leave blank to infer test or live mode automatically."
        error={dashboardUrlError}
        onChange={() => setDashboardUrlError(undefined)}
      />
    </Form>
  );
}
