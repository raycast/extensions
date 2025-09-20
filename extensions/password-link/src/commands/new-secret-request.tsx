import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { apiClient } from "../lib/api-client";
import { getPreferenceValues } from "@raycast/api";
import MultiStepForm from "../components/MultiStepForm";
import SecretRequestForm from "../components/SecretRequestForm";
import SecretConfigForm from "../components/SecretConfigForm";
import SuccessPage from "../components/SuccessPage";
import { useMultiStepForm } from "../hooks/useMultiStepForm";
import { dateToHoursFromNow } from "../lib/utils";

interface FormData {
  // Step 1: Request Info
  requestDescription: string;
  requestMessage: string;
  requestExpiration: Date | null;
  requestLimit: string;
  sendRequestToEmail: string;
  // Step 2: Secret Config
  secretDescription: string;
  secretMessage: string;
  expiresIn: Date | null;
  sendToEmail: string;
  secretPassword: string;
  secretMaxViews: string;
}

const initialFormData: FormData = {
  requestDescription: "",
  requestMessage: "",
  requestExpiration: null,
  requestLimit: "1",
  sendRequestToEmail: "",
  secretDescription: "",
  secretMessage: "",
  expiresIn: null,
  sendToEmail: "",
  secretPassword: "",
  secretMaxViews: "1",
};

interface SuccessData {
  secretUrl: string;
  secretId: string;
}

export default function NewSecretRequest() {
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [secretDefaultsSet, setSecretDefaultsSet] = useState(false);

  const handleSubmit = async (data: FormData) => {
    try {
      // Convert dates to hours
      const requestExpirationHours = data.requestExpiration ? dateToHoursFromNow(data.requestExpiration) : 24;
      const secretExpirationHours = data.expiresIn ? dateToHoursFromNow(data.expiresIn) : undefined;

      // Auto-populate descriptions with messages if descriptions are empty
      const requestDescription = data.requestDescription.trim() || data.requestMessage.trim();
      const secretDescription = data.secretDescription.trim() || data.secretMessage.trim();

      // Create the secret request with all the secret configuration
      const request = await apiClient.createSecretRequest({
        description: requestDescription,
        message: data.requestMessage.trim(),
        expiration: requestExpirationHours || 24,
        limit: parseInt(data.requestLimit) || 1,
        send_request_to_email: data.sendRequestToEmail || undefined,
        send_to_email: data.sendToEmail || undefined,
        secret_description: secretDescription,
        secret_message: data.secretMessage.trim(),
        secret_expiration: secretExpirationHours,
        secret_password: data.secretPassword || undefined,
        secret_max_views: data.secretMaxViews ? parseInt(data.secretMaxViews) : 1,
      });

      // Get the base URL from preferences
      const config = getPreferenceValues<{ baseUrl: string }>();
      const baseUrl = config.baseUrl || "https://password.link";

      // Create the request URL (not secret URL)
      const requestUrl = `${baseUrl}/req/${request.data.id}`;

      // Set success data to show success page
      setSuccessData({
        secretUrl: requestUrl,
        secretId: request.data.id,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Secret Request Created",
        message: `Request: ${requestDescription}`,
      });
    } catch (error) {
      console.error("Error creating secret request:", error);
      showFailureToast(error, { title: "Failed to create secret request" });
    }
  };

  const {
    currentStepIndex,
    formData,
    isLoading,
    updateFormData,
    handleStepChange,
    handleSubmit: submitForm,
  } = useMultiStepForm({
    initialData: initialFormData,
    onSubmit: handleSubmit,
  });

  // Set secret defaults when moving to secret step (only once)
  const handleStepChangeWithDefaults = (index: number) => {
    // If moving to secret step (index 1) and defaults haven't been set yet
    if (index === 1 && !secretDefaultsSet) {
      const updates: Partial<FormData> = {};

      // Only set secret description if it's empty and request description exists
      if (!formData.secretDescription.trim() && formData.requestDescription.trim()) {
        updates.secretDescription = formData.requestDescription;
      }

      // Only set secret message if it's empty and request message exists
      if (!formData.secretMessage.trim() && formData.requestMessage.trim()) {
        updates.secretMessage = formData.requestMessage;
      }

      // Update form data with defaults if any were set
      if (Object.keys(updates).length > 0) {
        updateFormData(updates);
      }

      // Mark defaults as set
      setSecretDefaultsSet(true);
    }

    // Call the original step change handler
    handleStepChange(index);
  };

  // Validation functions
  const validateRequestStep = () => {
    const errors: Record<string, string> = {};
    if (!formData.requestMessage.trim()) {
      errors.message = "Message is required";
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const validateSecretStep = () => {
    const errors: Record<string, string> = {};
    if (!formData.secretMessage.trim()) {
      errors.message = "Secret message is required";
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const handleValidationErrors = (errors: Record<string, string>) => {
    setValidationErrors(errors);
  };

  const clearValidationError = (field: string) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Show success page if we have success data
  if (successData) {
    return <SuccessPage secretUrl={successData.secretUrl} secretId={successData.secretId} />;
  }

  const steps = [
    {
      id: "request-info",
      title: "Request Information",
      component: (
        <SecretRequestForm
          values={{
            description: formData.requestDescription,
            message: formData.requestMessage,
            expiration: formData.requestExpiration,
            limit: formData.requestLimit,
            sendRequestToEmail: formData.sendRequestToEmail,
          }}
          onChange={({ description, message, expiration, limit, sendRequestToEmail }) =>
            updateFormData({
              requestDescription: description,
              requestMessage: message,
              requestExpiration: expiration,
              requestLimit: limit,
              sendRequestToEmail,
            })
          }
          validationErrors={validationErrors}
          onClearValidationError={clearValidationError}
        />
      ),
      validate: validateRequestStep,
    },
    {
      id: "secret-config",
      title: "Secret Configuration",
      component: (
        <SecretConfigForm
          values={{
            description: formData.secretDescription,
            message: formData.secretMessage,
            expiresIn: formData.expiresIn,
            sendToEmail: formData.sendToEmail,
            secretPassword: formData.secretPassword,
            secretMaxViews: formData.secretMaxViews,
          }}
          onChange={({ description, message, expiresIn, sendToEmail, secretPassword, secretMaxViews }) =>
            updateFormData({
              secretDescription: description,
              secretMessage: message,
              expiresIn,
              sendToEmail,
              secretPassword,
              secretMaxViews,
            })
          }
          validationErrors={validationErrors}
          onClearValidationError={clearValidationError}
        />
      ),
      validate: validateSecretStep,
    },
  ];

  return (
    <MultiStepForm
      steps={steps}
      currentStepIndex={currentStepIndex}
      onStepChange={handleStepChangeWithDefaults}
      onSubmit={submitForm}
      isLoading={isLoading}
      submitTitle="Create Secret Request"
      onValidationErrors={handleValidationErrors}
    />
  );
}
