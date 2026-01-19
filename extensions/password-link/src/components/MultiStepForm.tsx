import { ActionPanel, Action, Form, Icon, useNavigation } from "@raycast/api";
import { ReactNode } from "react";

interface Step {
  id: string;
  title: string;
  component: ReactNode;
  canGoNext?: boolean;
  canGoBack?: boolean;
  isValid?: boolean;
  validate?: () => { isValid: boolean; errors?: Record<string, string> };
}

interface MultiStepFormProps {
  steps: Step[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  submitTitle?: string;
  onValidationErrors?: (errors: Record<string, string>) => void;
}

export default function MultiStepForm({
  steps,
  currentStepIndex,
  onStepChange,
  onSubmit,
  isLoading = false,
  submitTitle = "Submit",
  onValidationErrors,
}: MultiStepFormProps) {
  const { pop } = useNavigation();
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const validateCurrentStep = () => {
    if (currentStep.validate) {
      const result = currentStep.validate();
      if (!result.isValid && result.errors) {
        onValidationErrors?.(result.errors);
        return false;
      }
    }
    onValidationErrors?.({});
    return true;
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      if (validateCurrentStep()) {
        onStepChange(currentStepIndex + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      onValidationErrors?.({});
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      if (validateCurrentStep()) {
        onSubmit();
      }
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {isLastStep ? (
            <Action.SubmitForm
              title={submitTitle}
              onSubmit={handleSubmit}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
          ) : (
            <Action.SubmitForm
              title={`Next: ${steps[currentStepIndex + 1]?.title}`}
              onSubmit={handleNext}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
          {!isFirstStep && (
            <Action
              title={`Back to ${steps[currentStepIndex - 1]?.title}`}
              icon={Icon.ArrowLeft}
              onAction={handleBack}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
          )}
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      {currentStep.component}
    </Form>
  );
}
