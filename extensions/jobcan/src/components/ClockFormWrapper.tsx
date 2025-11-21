import { showToast, Toast, popToRoot } from "@raycast/api";
import { ClockForm } from "./ClockForm";
import { ClockField } from "../lib/clock-fields";
import { setStoredFieldSchema, setRememberedFieldValue, clearFieldValue } from "../lib/clock-storage";
import { generateFieldSchema } from "../lib/clock-fields";
import { clockInOut } from "../lib/api";

interface ClockFormWrapperProps {
  entryDate: Date;
  fields: ClockField[];
  rememberedValues: Record<string, string>;
  onSuccess: () => void;
}

export function ClockFormWrapper(props: ClockFormWrapperProps) {
  const { entryDate, fields, rememberedValues, onSuccess } = props;

  const executeClockWithValues = async (values: Record<string, string>) => {
    // Use field map format
    await clockInOut(entryDate, values);
  };

  const handleSubmit = async (values: Record<string, string>, rememberFlags: Record<string, boolean>) => {
    try {
      // Store or clear values based on remember flags
      for (const [fieldName, shouldRemember] of Object.entries(rememberFlags)) {
        if (shouldRemember) {
          await setRememberedFieldValue(fieldName, values[fieldName] || "");
        } else {
          await clearFieldValue(fieldName);
        }
      }

      // Update stored schema
      const schema = generateFieldSchema(fields);
      await setStoredFieldSchema(schema);

      // Execute clock
      await executeClockWithValues(values);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Clock In & Out completed successfully",
      });

      onSuccess();
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to clock in/out",
      });
    }
  };

  return <ClockForm fields={fields} rememberedValues={rememberedValues} onSubmit={handleSubmit} />;
}
