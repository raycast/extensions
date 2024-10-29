import { ActionPanel, Detail, Form, Icon, Toast, showToast, getPreferenceValues, Action } from "@raycast/api";
import { SportType, StravaActivitySummary, StravaManualActivity } from "./api/types";
import { createActivity, provider } from "./api/client";
import { formatSportTypesText, isDurationValid, isNumber } from "./utils";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState, useRef } from "react";

function CreateActivity() {
  const sportTypes = Object.values(SportType);
  const distanceUnitRef = useRef(getPreferenceValues<Preferences>().distance_unit);
  const distanceFieldTitle = "Distance (" + distanceUnitRef.current + ")";
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activityDetails, setActivityDetails] = useState<StravaActivitySummary>();

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
      const activity = await createActivity({ ...values, distanceUnit: distanceUnitRef.current });
      toast.style = Toast.Style.Success;
      toast.title = "Activity saved";
      setIsSubmitted(true);
      setActivityDetails(activity);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed creating activity";
      toast.message = String(error);
    }
  }

  if (isSubmitted && activityDetails) {
    const stravaLink = `https://www.strava.com/activities/${activityDetails.id}/`;
    const markdownContent = `## 🎉 Kudos!

Kudos to you for logging another workout!

You can now view it on Strava [here](${stravaLink}).

Keep up the great work and stay active!`;

    return (
      <Detail
        markdown={markdownContent}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View on Strava" url={stravaLink} />
          </ActionPanel>
        }
      />
    );
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
