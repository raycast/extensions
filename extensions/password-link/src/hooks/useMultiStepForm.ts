import { useState } from "react";

interface UseMultiStepFormProps<T> {
  initialData: T;
  onSubmit: (data: T) => Promise<void>;
}

export function useMultiStepForm<T>({ initialData, onSubmit }: UseMultiStepFormProps<T>) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const updateFormData = (updates: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentStepIndex,
    formData,
    isLoading,
    updateFormData,
    handleStepChange,
    handleSubmit,
  };
}
