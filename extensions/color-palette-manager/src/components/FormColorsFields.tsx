import { Form } from "@raycast/api";
import { useEffect, useRef } from "react";
import { MAX_COLOR_FIELDS } from "../constants";
import { FormColorItems, PaletteFormFields } from "../types";

type FormItemRef = Form.ItemReference | null;

interface FormColorsFieldsProps {
  data: {
    /** Number of color fields to render */
    colorCount: number;
  };
  /** Form integration */
  form: {
    /** Form item properties for color fields specifically */
    colors: FormColorItems;
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
  const fieldRefs = useRef<Record<string, FormItemRef>>({});

  // Programmatically focus color fields when they're added
  useEffect(() => {
    if (focus.currentField && focus.currentField.startsWith("color")) {
      fieldRefs.current[focus.currentField]?.focus();
    }
  }, [focus.currentField]);

  return (
    <>
      <Form.Separator />
      {Array.from({ length: data.colorCount }, (_, index) => {
        const colorKey = `color${index + 1}` as keyof PaletteFormFields;
        const isFirstColor = index === 0; // First color field is required
        const focusHandlers = focus.create(colorKey);

        return (
          <Form.TextField
            key={index}
            {...(form.colors[colorKey] as Partial<Form.ItemProps<string>> & { id: string })}
            ref={(el: FormItemRef) => {
              fieldRefs.current[colorKey] = el;
            }}
            title={`${index + 1}. Color${isFirstColor ? "*" : ""}`}
            info={isFirstColor ? `Minimum: 1 Color. Maximum: ${MAX_COLOR_FIELDS} Colors` : ""}
            placeholder="e.g., #FF5733, #F57, #1E90FF"
            onFocus={focusHandlers.onFocus}
            onBlur={focusHandlers.onBlur}
          />
        );
      })}
    </>
  );
}
