import { ActionPanel, Form, Icon, Toast, showToast, getPreferenceValues, Action } from "@raycast/api";
import { SportType, StravaManualActivity } from "./api/types";
import { createActivity, provider } from "./api/client";
import { formatSportTypesText, isDurationValid, isNumber } from "./utils";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useRef } from "react";

function CreateActivity() {
  const sportTypes = Object.values(SportType);
  const distanceUnitRef = useRef(getPreferenceValues<Preferences>().distance_unit);
  const distanceFieldTitle = "Distance (" + distanceUnitRef.current + ")";

  const { handleSubmit, itemProps } = useForm<StravaManualActivity>({
    onSubmit(values) {
      submitActivity(values);
    },
    validation: {
      name: FormValidation.Required,
      date: FormValidation.Required,
      sportType: FormValidation.Required,
      duration: (value) => {
        if (!value) {
          return "Enter in a duration";
        } else if (!isDurationValid(value)) {
          return "Use the format hh:mm:ss";
        }
      },
      distance: (value) => {
        if (isNumber(value) || value == "") {
          return undefined;
        } else {
          return "Enter a valid number";
        }
      },
    },
  });

  async function submitActivity(values: StravaManualActivity) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving your activity",
    });
    try {
      await createActivity({ ...values, distanceUnit: distanceUnitRef.current });
      toast.style = Toast.Style.Success;
      toast.title = "Activity saved";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed creating activity";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Submit Actvity" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name *" placeholder="Enter a name for your activity" {...itemProps.name} />
      <Form.Dropdown title="Sport Type *" {...itemProps.sportType}>
        <Form.Dropdown.Item value="" title="Please select an option" />
        {sportTypes.map((sportType) => (
          <Form.Dropdown.Item key={sportType} value={sportType} title={formatSportTypesText(sportType)} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="date" title="Date *" defaultValue={new Date()} />
      <Form.TextField
        title={"Duration (hh:mm:ss) *"}
        placeholder="Enter the duration for your activity"
        {...itemProps.duration}
      />
      <Form.TextField title={distanceFieldTitle} placeholder="Enter in your distance" {...itemProps.distance} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.Checkbox label="Trainer" {...itemProps.isTrainer} />
      <Form.Checkbox label="Commute" {...itemProps.isCommute} />
    </Form>
  );
}

export default withAccessToken(provider)(CreateActivity);
