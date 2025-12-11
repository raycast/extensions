export const tones = [
  "None",
  "Friendly",
  "Conversational",
  "Neutral",
  "Formal",
  "Professional",
  "Technical",
  "Academic",
  "Persuasive",
  "Empathetic",
] as const;
type Tone = (typeof tones)[number];

export const creativity = ["None", "Low", "Medium", "High"];
type Creativity = (typeof creativity)[number];

export interface FormValues {
  role?: string;
  task: string;
  reference?: string;
  format?: string;
  tone?: Tone;
  audience?: string;
  creativity?: Creativity;
  example?: string;
  meta?: string;
  reasoning?: boolean;
  sources?: boolean;
  summary?: boolean;
  noEmDash?: boolean;
}

export interface PreviewPromptProps {
  prompt: string;
}

export interface Template extends FormValues {
  id: string;
  title: string;
}

export interface SaveTemplateFormProps {
  addTemplate: (title: string, values: FormValues) => Promise<string>;
  updateTemplate?: (id: string, title: string, values: FormValues) => Promise<void>;
  selectedTemplateId?: string;
  setSelectedTemplateId: React.Dispatch<React.SetStateAction<string>>;
  templates: Template[];
  formValues: FormValues;
  isUpdate: boolean;
  initialTitle?: string;
}

export interface PromptFormActionsProp {
  formState: {
    formValues: FormValues;
    resetFormValues: () => void;
    setTaskError: React.Dispatch<React.SetStateAction<string | undefined>>;
  };
  templateState: {
    selectedTemplateId: string;
    setSelectedTemplateId: React.Dispatch<React.SetStateAction<string>>;
    templates: Template[];
    addTemplate: (title: string, values: FormValues) => Promise<string>;
    updateTemplate: (id: string, title: string, values: FormValues) => Promise<void>;
    deleteTemplate: () => Promise<void>;
    deleteAllTemplates: () => Promise<void>;
  };
}
