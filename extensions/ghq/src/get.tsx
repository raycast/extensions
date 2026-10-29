import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { getRepository, validateRepository } from "./ghq/command";
import { getGHQRootPath } from "./preferences";

interface Values {
  repository: string;
  ssh: boolean;
  shallow: boolean;
  update: boolean;
}

export default function Command(props: LaunchProps<{ arguments: { repository?: string } }>) {
  const initialRepository = props.arguments.repository || props.fallbackText || "";
  const launched = useRef(false);
  const submitting = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { repository: initialRepository, ssh: false, shallow: false, update: false },
    validation: { repository: (value) => validateRepository(value || "") },
    async onSubmit(values) {
      if (submitting.current) return;
      submitting.current = true;
      setIsLoading(true);
      let toast: Toast | undefined;
      try {
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Getting repository",
          message: values.repository.trim(),
        });
        const preferences = getPreferenceValues<{ GHQ_PATH?: string }>();
        await getRepository(values.repository, {
          rootPath: getGHQRootPath(),
          ghqPath: preferences.GHQ_PATH?.trim(),
          ssh: values.ssh,
          shallow: values.shallow,
          update: values.update,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Repository ready";
        toast.primaryAction = {
          title: "Search Repositories",
          async onAction() {
            try {
              await launchCommand({ name: "list", type: LaunchType.UserInitiated });
            } catch (error) {
              await showFailureToast(error, { title: "Could not open repository search" });
            }
          },
        };
      } catch (error) {
        await toast?.hide();
        await showFailureToast(error, { title: "Could not get repository" });
      } finally {
        submitting.current = false;
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    if (launched.current || !initialRepository.trim()) return;
    launched.current = true;
    void handleSubmit({ repository: initialRepository, ssh: false, shallow: false, update: false });
  }, [handleSubmit, initialRepository]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Repository" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Repository"
        placeholder="https://github.com/owner/repository or owner/repository"
        info="Accepts repository URLs, SSH URLs, and ghq shorthand paths. Uses your configured ghq root path."
        {...itemProps.repository}
      />
      <Form.Checkbox label="Clone using SSH" {...itemProps.ssh} />
      <Form.Checkbox label="Create a shallow clone" {...itemProps.shallow} />
      <Form.Checkbox label="Update if already cloned" {...itemProps.update} />
    </Form>
  );
}
