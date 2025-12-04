import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { saveComeFrom, saveInterest } from "../store"; // Assuming these functions are defined in utils/storage
import { requestWithFallback } from "../utils/request"; // Import from your utils/request
import { ExternalSource } from "../types";

// Type definition for recommendation data
export interface RecommendedSourcesFromInterest {
  title: string;
  sources: ExternalSource[];
}

export type RecommendedData = RecommendedSourcesFromInterest[];

// Form data type
interface FormData {
  interest: string;
  comeFrom: "X(Twitter)" | "Raycast Store" | "Search Engine" | "Social Media" | "Others";
}

export default function Onboarding(props: { onSkip: () => void; onSuccess: (payload: ExternalSource[]) => void }) {
  const { onSkip, onSuccess } = props;
  const { data } = usePromise(
    async () => {
      return await requestWithFallback(
        "https://raw.githubusercontent.com/DophinL/tidyread-cloud/main/data/recommended_data.json",
        "https://tidyread-pub.s3.us-west-2.amazonaws.com/recommended_data.json",
      ).then((res) => {
        return res.json() as unknown as RecommendedData;
      });
    },
    [],
    {
      onWillExecute: () => {
        showToast(Toast.Style.Animated, "Pulling Data...");
      },
      onData: () => {
        showToast(Toast.Style.Success, "Data Pulled");
      },
      onError: (err) => {
        showToast(Toast.Style.Failure, "Data Pull Failed", err.message);
      },
    },
  );

  const { handleSubmit, itemProps } = useForm<FormData>({
    initialValues: {
      interest: "",
      comeFrom: undefined,
    },
    async onSubmit(formValues) {
      if (!data) {
        showToast(
          Toast.Style.Failure,
          "Data Not Ready",
          "Failed to pull data, please close and retry, or select `Skip` in Actions",
        );
        return;
      }
      showToast(Toast.Style.Success, "Form Submitted", "Recommended sources are being generated for you...");
      const selectedInterest = data!.find((i) => i.title === formValues.interest);
      await saveComeFrom(formValues.comeFrom);
      await saveInterest(formValues.interest);
      onSuccess(selectedInterest?.sources || []);
    },
  });

  return (
    <Form
      navigationTitle="Onboarding"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon="send-horizontal.svg" title="Submit" onSubmit={handleSubmit} />
          <Action
            title="Skip"
            icon="skip-forward.svg"
            onAction={() => {
              onSkip();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.interest} title="Select Interest" placeholder="Please select your interest">
        {(data || []).map((interest, index) => (
          <Form.Dropdown.Item key={index} value={interest.title} title={interest.title} />
        ))}
      </Form.Dropdown>
      {/* @ts-ignore */}
      <Form.Dropdown {...itemProps.comeFrom} title="How Did You Hear About Tidyread" placeholder="Please select">
        <Form.Dropdown.Item value="X(Twitter)" title="X(Twitter)" />
        <Form.Dropdown.Item value="Raycast Store" title="Raycast Store" />
        <Form.Dropdown.Item value="Search Engine" title="Search Engine" />
        <Form.Dropdown.Item value="Social Media" title="Social Media" />
        <Form.Dropdown.Item value="Others" title="Others" />
      </Form.Dropdown>
      <Form.Description text="🚀 Based on your selection, Tidyread will automatically generate sources to speed up your onboarding process." />
      <Form.Description text="🤔 If you don't like it, feel free to `Skip` in `Actions`." />
    </Form>
  );
}
