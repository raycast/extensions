import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LaunchType,
  List,
  PopToRootType,
  Toast,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useProjects } from "./hooks/useProjects";
import { useActivities } from "./hooks/useActivities";
import { saveTimesheet } from "./libs/api";
import dayjs from "dayjs";
import getPreferences from "./libs/preferences";

interface FormValues {
  project: string;
  activity: string;
  activityDate: Date | null;
  description: string;
  duration: string; //  number in minutes
}

const DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss";

const LogTimeCommand = () => {
  const { duration, email, password, token } = getPreferences();
  const initialDuration = parseInt(duration);
  const validPreferences = Boolean((email && password) || token);
  const { isLoading: isLoadingProjects, projects, visitItem: visitProject } = useProjects();
  const { isLoading: isLoadingActivities, activities, visitItem: visitActivity } = useActivities();

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    onSubmit: async (values) => {
      if (!values.activityDate) {
        showToast({ style: Toast.Style.Failure, title: "Please select date!" });
        return;
      }

      const project = projects.find((p) => p.id === values.project);
      const activity = activities.find((a) => a.id === values.activity);
      project && visitProject(project);
      activity && visitActivity(activity);

      try {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Saving new time log!" });
        const begin = dayjs(values.activityDate).set("seconds", 0).format(DATE_FORMAT);
        const end = dayjs(values.activityDate)
          .add(Number(values.duration), "minutes")
          .set("seconds", 0)
          .format(DATE_FORMAT);
        await saveTimesheet({
          begin,
          end,
          project: Number(values.project),
          activity: Number(values.activity),
          description: values.description,
        });

        await showHUD("Log time saved!", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        toast.hide();
        await launchCommand({ name: "logged-hours", type: LaunchType.Background });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: "Logging time failed!", message: JSON.stringify(err) });
      }
    },
    validation: {
      project: FormValidation.Required,
      activity: FormValidation.Required,
      activityDate: (value) => {
        if (value === null || value === undefined) {
          return "Please select date!";
        }
      },
      duration: (value) => {
        if (!value) {
          return "Please enter duration!";
        }
        const numberValue = parseInt(value);
        if (isNaN(numberValue)) {
          return "Please enter duration!";
        }
      },
    },
    initialValues: {
      activityDate: new Date(),
      duration: isNaN(initialDuration) ? "0" : String(initialDuration),
    },
  });

  if (!validPreferences) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title="Please set your API token or your email and password in the preferences"
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoadingProjects || isLoadingActivities}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Activity Date" type={Form.DatePicker.Type.Date} {...itemProps.activityDate} />
      <Form.TextField title="Duration (in minutes)" autoFocus {...itemProps.duration} />
      <Form.Dropdown
        title="Project"
        {...itemProps.project}
        error={!projects.length ? "Please add projects first!" : itemProps.project.error}
      >
        {projects?.map((p) => <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />)}
      </Form.Dropdown>
      <Form.Dropdown
        title="Activity"
        {...itemProps.activity}
        error={!activities.length ? "Please add activities first!" : itemProps.activity.error}
      >
        {activities
          ?.filter((a) => !a.project || String(a.project) === values.project)
          .map((a) => <Form.Dropdown.Item key={a.id} value={a.id} title={a.name} />)}
      </Form.Dropdown>
      <Form.TextArea title="Description" {...itemProps.description} />
    </Form>
  );
};

export default LogTimeCommand;
