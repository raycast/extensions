import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { TCreateFeatureReq, TError, TFeature } from "../types";
import { useState } from "react";
import { useGetAllFeatureTypes } from "../hooks/useGetAllFeatureTypes";
import { createFeature, validateFeatureName } from "../api";
import { useCachedState } from "@raycast/utils";
import { generateErrorMessage } from "../helpers";

type FormValues = {
  name: string;
  type: string;
  description?: string;
  impressionData: boolean;
};

export default function CreateFeature({ revalidate }: { revalidate: () => Promise<TFeature[]> }) {
  const [featureName, setFeatureName] = useState("");
  const [featureNameError, setFeatureNameError] = useState("");
  const [selectedFeatureType, setSelectedFeatureType] = useState("");

  const { data: featureTypes, isLoading: isLoadingFeatureType } = useGetAllFeatureTypes();

  const [projectId] = useCachedState("project-id", "");

  const { pop } = useNavigation();

  const handleValidateFeatureName = async (toast: Toast, name: string) => {
    try {
      await validateFeatureName({
        name,
      });

      return true;
    } catch (err) {
      const errResponse = err as TError;
      const errCode = errResponse.code;
      const errMessage = `${errResponse.details[0].message} ${errCode}` ?? "Invalid feature name";

      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = errMessage;

      return false;
    }
  };

  const handleSubmit = async (values: FormValues) => {
    const toast = await showToast({
      title: "Creating Feature...",
      style: Toast.Style.Animated,
    });

    try {
      const isValid = await handleValidateFeatureName(toast, values.name);

      if (isValid) {
        const body: TCreateFeatureReq = {
          name: values.name,
          type: values.type,
          impressionData: values.impressionData,
          projectId,
        };

        if (values.description) {
          body.description = values.description;
        }

        await createFeature(body);

        await revalidate();

        toast.style = Toast.Style.Success;
        toast.title = "Feature Created";

        pop();
      }
    } catch (err) {
      const errResponse = err as TError;
      const errMessage = generateErrorMessage(errResponse.code);

      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = errMessage;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Feature"
            onSubmit={async (values: FormValues) => {
              await handleSubmit(values);
            }}
          />
        </ActionPanel>
      }
      navigationTitle="Create New Feature Toggle"
    >
      <Form.TextField
        id="name"
        title="Name"
        info="Name must be URL-friendly and unique within the project."
        placeholder="Name"
        value={featureName}
        onChange={(val) => {
          const name = val.trim();
          setFeatureName(name);

          if (name.length > 0) {
            setFeatureNameError("");
          }
        }}
        error={featureNameError}
        onBlur={(ev) => {
          const value = ev.target.value?.trim();

          if (value?.length === 0) {
            setFeatureNameError("Required");
          }
        }}
      />
      <Form.Dropdown
        id="type"
        title="Toggle Type"
        placeholder="Toggle Type"
        defaultValue={featureTypes?.[0]?.id}
        isLoading={isLoadingFeatureType}
        info={featureTypes?.find((type) => type.id === selectedFeatureType)?.description}
        onChange={(val) => {
          setSelectedFeatureType(val);
        }}
      >
        {featureTypes?.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} icon={Icon.Cd} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="description" title="Description" placeholder="Description" info="Optional" />
      <Form.Checkbox
        id="impressionData"
        label="Impression Data"
        defaultValue={false}
        info={`"true" if the impression data collection is enabled for the feature, otherwise "false".`}
      />
    </Form>
  );
}
