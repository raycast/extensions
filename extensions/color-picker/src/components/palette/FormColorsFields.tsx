import { Form } from "@raycast/api";
import { useEffect, useRef } from "react";
import { PaletteFormFields } from "../../types";

interface FormColorsFieldsProps {
  data: {
    /** Number of color fields to render */
    colorCount: number;
  };
  /** Form integration */
  form: {
    /** Form item properties for color fields specifically */
    colorProps: Record<string, Partial<Form.ItemProps<string>> & { id: string }>;
  };
  /** Focus management */
  focus: {
    /** Currently focused field for programmatic focus */
    currentField: string | null;
    /** Function to create focus handlers for real-time tracking */
    create: (fieldName: string) => { onFocus: () => void; onBlur: () => void };
  };
}

export function FormColorsFields({ data, form, focus }: FormColorsFieldsProps) {
  const fieldRefs = useRef<Record<string, unknown>>({});

  // Programmatically focus color fields when they're added
  useEffect(() => {
    if (focus.currentField && focus.currentField.startsWith("color")) {
      const fieldElement = fieldRefs.current[focus.currentField];
      if (
        fieldElement &&
        typeof fieldElement === "object" &&
        "focus" in fieldElement &&
        typeof fieldElement.focus === "function"
      ) {
        fieldElement.focus();
      }
    }
  }, [focus.currentField]);

  return (
    <>
      <Form.Separator />
      {Array.from({ length: data.colorCount }, (_, index) => {
        const colorKey = `color${index + 1}` as keyof PaletteFormFields;
        const isRequired = index === 0; // First color field is required
        const focusHandlers = focus.create(colorKey);

        return (
          <Form.TextField
            key={index}
            {...(form.colorProps[colorKey] as Partial<Form.ItemProps<string>> & { id: string })}
            ref={(el: unknown) => {
              fieldRefs.current[colorKey] = el;
            }}
            title={`${index + 1}. Color${isRequired ? "*" : ""}`}
            placeholder="e.g., #FF5733, #F57, #1E90FF"
            onFocus={focusHandlers.onFocus}
            onBlur={focusHandlers.onBlur}
          />
        );
      })}
    </>
  );
}
