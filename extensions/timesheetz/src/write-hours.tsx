import { ActionPanel, Form, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useFetch } from "@raycast/utils";

interface Preferences {
  apiEndpoint: string;
}

interface HoursFormValues {
  date: Date;
  clientName: string;
  clientHours: string;
  trainingHours: string;
  vacationHours: string;
  sickHours: string;
  idleHours: string;
}

export default function Command(props: { draftValues?: Partial<HoursFormValues> }) {
  const draftValues = props.draftValues;
  const preferences = getPreferenceValues<Preferences>();

  // Fetch the last client name using useFetch
  const { data: lastClientData, isLoading } = useFetch(`${preferences.apiEndpoint}/api/last-client`);

  const { handleSubmit, itemProps } = useForm<HoursFormValues>({
    async onSubmit(values) {
      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Submitting hours...",
        });

        const formattedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(values.date);

        const requestData = {
          date: formattedDate,
          client_name: values.clientName,
          client_hours: parseInt(values.clientHours) || 0,
          vacation_hours: parseInt(values.vacationHours) || 0,
          idle_hours: parseInt(values.idleHours) || 0,
          training_hours: parseInt(values.trainingHours) || 0,
          sick_hours: parseInt(values.sickHours) || 0,
        };

        const response = await fetch(`${preferences.apiEndpoint}/api/timesheet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        toast.style = Toast.Style.Success;
        toast.title = "Hours Submitted";
        toast.message = `Hours for ${values.clientName} successfully recorded`;

        console.log("Submitted values:", requestData);
      } catch (error) {
        console.error("Error submitting hours:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to submit hours",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    validation: {
      clientName: FormValidation.Required,
      clientHours: (value) => {
        if (value && isNaN(Number(value))) {
          return "Please enter a valid number";
        }
      },
      trainingHours: (value) => {
        if (value && isNaN(Number(value))) {
          return "Please enter a valid number";
        }
      },
      vacationHours: (value) => {
        if (value && isNaN(Number(value))) {
          return "Please enter a valid number";
        }
      },
      idleHours: (value) => {
        if (value && isNaN(Number(value))) {
          return "Please enter a valid number";
        }
      },
      sickHours: (value) => {
        if (value && isNaN(Number(value))) {
          return "Please enter a valid number";
        }
      },
    },
    initialValues: {
      date: draftValues?.date || new Date(),
      clientName: draftValues?.clientName || (lastClientData?.client_name ?? ""),
      clientHours: draftValues?.clientHours || "0",
      trainingHours: draftValues?.trainingHours || "0",
      vacationHours: draftValues?.vacationHours || "0",
      sickHours: draftValues?.sickHours || "0",
      idleHours: draftValues?.idleHours || "0",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker {...itemProps.date} title="Date" type={Form.DatePicker.Type.Date} />
      <Form.TextField {...itemProps.clientName} title="Client Name" placeholder="Enter Client Name" />
      <Form.TextField {...itemProps.clientHours} title="Client Hours" placeholder="Enter Client Hours" autoFocus />
      <Form.TextField {...itemProps.trainingHours} title="Training Hours" placeholder="Enter Training Hours" />
      <Form.TextField {...itemProps.vacationHours} title="Vacation Hours" placeholder="Enter Vacation Hours" />
      <Form.TextField {...itemProps.sickHours} title="Sick Hours" placeholder="Enter Sick Hours" />
      <Form.TextField {...itemProps.idleHours} title="Idle Hours" placeholder="Enter Idle Hours" />
    </Form>
  );
}
