import { Form } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_RECORDING_OPTIONS } from "~/constants/recording";
import { RecordingPreferences, type VideoCodec, VIDEO_CODEC } from "~/types/recording";
import { debounce } from "~/utils/debounce";
import { getStoredRecordingPreferences, saveRecordingPreferences } from "~/utils/storage";

type FormSchema = ReplaceProperties<
  RecordingPreferences,
  {
    framesPerSecond: string;
    showCursor: boolean;
    highlightClicks: boolean;
    videoCodec: string;
  }
>;

export default function PreferencesCommand() {
  const { data: initialValues, isLoading } = useFormInitialValues();

  if (isLoading || !initialValues) return <Form isLoading />;
  return <PreferencesForm initialValues={initialValues} />;
}

const validation: NonNullable<Parameters<typeof useForm<FormSchema>>[0]["validation"]> = {
  highlightClicks: FormValidation.Required,
  showCursor: FormValidation.Required,
  framesPerSecond: (value) => {
    if (!value) return "Required";
    const parsedValue = parseInt(value, 10);
    if (Number.isNaN(parsedValue)) return "Invalid number";
    if (parsedValue <= 0 || parsedValue > 60) return "Must be between 1 and 60";
  },
  videoCodec: (value) => {
    if (!value) return "Required";
    if (!VIDEO_CODEC[value as keyof typeof VIDEO_CODEC]) return "Invalid codec";
  },
};

function PreferencesForm({ initialValues }: { initialValues: FormSchema }) {
  const { values, itemProps } = useForm<FormSchema>({
    onSubmit: () => undefined /* ignore, values are updated on change */,
    validation,
    initialValues,
  });

  useStoreFormValues(values, initialValues);

  return (
    <Form>
      <Form.TextField title="Frames per second (FPS)" {...itemProps.framesPerSecond} />
      <Form.Checkbox label="Show cursor" {...itemProps.showCursor} />
      <Form.Checkbox label="Highlight clicks" {...itemProps.highlightClicks} />
      <Form.Dropdown title="Video codec" {...itemProps.videoCodec}>
        <Form.Dropdown.Item value="h264" title="H264" />
        <Form.Dropdown.Item value="hevc" title="HVEC" />
        <Form.Dropdown.Item value="proRes422" title="Apple ProRes 422" />
        <Form.Dropdown.Item value="proRes4444" title="Apple ProRes 4444" />
      </Form.Dropdown>
    </Form>
  );
}

/** Stores the form values on change, if they're valid */
function useStoreFormValues(formValues: FormSchema, initialValues: FormSchema) {
  const lastValidValuesRef = useRef<FormSchema>();

  const storeValues = async (values: FormSchema) => {
    await saveRecordingPreferences({
      ...values,
      framesPerSecond: parseInt(values.framesPerSecond, 10),
      videoCodec: values.videoCodec as VideoCodec,
    });
    lastValidValuesRef.current = values;
  };

  const validateAndStoreValues = useCallback(
    debounce(async (values: FormSchema) => {
      const validValues = Object.entries(values).reduce<FormSchema>((acc, _value) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [key, value] = _value as [keyof FormSchema, any];

        const validator = validation[key];
        if (validator && typeof validator === "function") {
          const error = validator(value);
          if (!error) return { ...acc, [key]: value };
          return acc;
        }
        if (validator && validator === FormValidation.Required && value != null) {
          return { ...acc, [key]: value };
        }
        return acc;
      }, lastValidValuesRef.current ?? initialValues);

      await storeValues(validValues);
    }, 100),
    [],
  );

  useEffect(() => {
    void validateAndStoreValues(formValues);
  }, [formValues]);
}

function useFormInitialValues() {
  return usePromise(async (): Promise<FormSchema> => {
    const { framesPerSecond, ...restoredPreferences } = await getStoredRecordingPreferences();
    return {
      ...DEFAULT_RECORDING_OPTIONS,
      ...restoredPreferences,
      framesPerSecond: (framesPerSecond ?? DEFAULT_RECORDING_OPTIONS.framesPerSecond).toString(),
    };
  });
}
