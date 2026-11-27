import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  FormValidation,
  showFailureToast,
  useCachedPromise,
  useForm,
} from "@raycast/utils";
import {
  createTask,
  formatDurationHuman,
  getProjects,
  type Project,
} from "./api";

interface FormValues {
  projectId: string;
  startDateTime: Date | null;
  endDateTime: Date | null;
  description: string;
  billable: boolean;
}

function getDefaultStartTime(): Date {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  oneHourAgo.setMinutes(Math.floor(oneHourAgo.getMinutes() / 15) * 15, 0, 0);
  return oneHourAgo;
}

function getDefaultEndTime(): Date {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  return now;
}

export default function QuickLog() {
  const { pop } = useNavigation();
  const { data: projects, isLoading } = useCachedPromise(getProjects, [], {
    initialData: [] as Project[],
  });

  const activeProjects = projects.filter((p) => !p.archived);

  const { handleSubmit, itemProps, values, setValidationError } =
    useForm<FormValues>({
      async onSubmit(formValues) {
        if (
          formValues.startDateTime &&
          formValues.endDateTime &&
          formValues.endDateTime <= formValues.startDateTime
        ) {
          setValidationError(
            "endDateTime",
            "End time must be after start time",
          );
          return;
        }
        try {
          await showToast({
            style: Toast.Style.Animated,
            title: "Logging time...",
          });
          await createTask({
            projectId: formValues.projectId,
            startDateTime: formValues.startDateTime!.toISOString(),
            endDateTime: formValues.endDateTime!.toISOString(),
            description: formValues.description || undefined,
            billable: formValues.billable,
          });
          const durationMs =
            formValues.endDateTime!.getTime() -
            formValues.startDateTime!.getTime();
          await showToast({
            style: Toast.Style.Success,
            title: "Time logged",
            message: `${formatDurationHuman(durationMs)} logged`,
          });
          pop();
        } catch (error) {
          showFailureToast(error, { title: "Failed to log time" });
        }
      },
      initialValues: {
        startDateTime: getDefaultStartTime(),
        endDateTime: getDefaultEndTime(),
        billable: false,
        description: "",
      },
      validation: {
        projectId: FormValidation.Required,
        startDateTime: (value) => {
          if (!value) return "Start time is required";
        },
        endDateTime: (value) => {
          if (!value) return "End time is required";
        },
      },
    });

  const durationMs =
    values.startDateTime &&
    values.endDateTime &&
    values.endDateTime > values.startDateTime
      ? values.endDateTime.getTime() - values.startDateTime.getTime()
      : 0;
  const durationText = durationMs > 0 ? formatDurationHuman(durationMs) : "—";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Time" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Project" storeValue {...itemProps.projectId}>
        {activeProjects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.startDateTime}
      />
      <Form.DatePicker
        title="End"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.endDateTime}
      />
      <Form.Description title="Duration" text={durationText} />
      <Form.Separator />
      <Form.TextArea
        title="Description"
        placeholder="What did you work on?"
        {...itemProps.description}
      />
      <Form.Checkbox
        title="Billable"
        label="Mark as billable"
        {...itemProps.billable}
      />
    </Form>
  );
}
