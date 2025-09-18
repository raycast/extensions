// Mock for @raycast/utils
import { vi } from "vitest";

export const useForm = vi.fn((config) => {
  // Create a mock values object that updates when onChange is called
  const mockValues = {
    textInput: "",
    selectedAgent: "claude",
    template: "slack",
    tone: "professional",
    model: "Sonnet 4.0",
    additionalContext: "",
    targetFolder: "",
    ...config?.initialValues,
  };

  // Create itemProps with reactive values
  const itemProps = {
    textInput: {
      id: "textInput",
      get value() {
        return mockValues.textInput;
      },
      onChange: vi.fn((v) => {
        mockValues.textInput = v;
      }),
    },
    selectedAgent: {
      id: "selectedAgent",
      get value() {
        return mockValues.selectedAgent;
      },
      onChange: vi.fn((v) => {
        mockValues.selectedAgent = v;
      }),
    },
    template: {
      id: "template",
      get value() {
        return mockValues.template;
      },
      onChange: vi.fn((v) => {
        mockValues.template = v;
      }),
    },
    tone: {
      id: "tone",
      get value() {
        return mockValues.tone;
      },
      onChange: vi.fn((v) => {
        mockValues.tone = v;
      }),
    },
    model: {
      id: "model",
      get value() {
        return mockValues.model;
      },
      onChange: vi.fn((v) => {
        mockValues.model = v;
      }),
    },
    additionalContext: {
      id: "additionalContext",
      get value() {
        return mockValues.additionalContext;
      },
      onChange: vi.fn((v) => {
        mockValues.additionalContext = v;
      }),
    },
    targetFolder: {
      id: "targetFolder",
      get value() {
        return mockValues.targetFolder;
      },
      onChange: vi.fn((v) => {
        mockValues.targetFolder = v;
      }),
    },
  };

  const setValue = vi.fn((field, value) => {
    mockValues[field] = value;
  });

  const handleSubmit = vi.fn(() => {
    if (config?.onSubmit) {
      config.onSubmit(mockValues);
    }
  });

  return {
    handleSubmit,
    itemProps,
    values: mockValues,
    setValue,
    focus: vi.fn(),
    reset: vi.fn(),
    setValidationError: vi.fn(),
  };
});

export const FormValidation = {
  Required: "required",
};

export const useExec = vi.fn(() => ({
  data: undefined,
  error: undefined,
  isLoading: false,
  revalidate: vi.fn(),
}));

export const useFetch = vi.fn();

export const usePromise = vi.fn();

export const useCachedState = vi.fn(() => [undefined, vi.fn()]);

export const useLocalStorage = vi.fn(() => ({
  value: [],
  setValue: vi.fn(),
  removeValue: vi.fn(),
  isLoading: false,
}));

export const useNavigation = vi.fn(() => ({
  push: vi.fn(),
  pop: vi.fn(),
}));
