import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { insertTerm, checkTermExists } from "./data-store";

interface InsertTermProps {
  onInsert: () => void;
  initialTerm?: string;
}

interface FormValues {
  term: string;
  definition: string;
}

export default function InsertTerm({ onInsert, initialTerm }: InsertTermProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [existingTerm, setExistingTerm] = useState<{
    term: string;
    definition: string;
  } | null>(null);

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    onSubmit(values: FormValues) {
      _handleSubmit(values);
    },
    validation: {
      term: (value: string | undefined): string | undefined => {
        if (!value) {
          return "Term is required";
        }
        return undefined;
      },
      definition: (value: string | undefined): string | undefined => {
        if (!value) {
          return "Definition is required";
        }
        return undefined;
      },
    },
    initialValues: {
      term: initialTerm || "",
      definition: "",
    },
  });

  useEffect(() => {
    const checkExisting = async () => {
      if (values.term?.trim()) {
        const existing = await checkTermExists(values.term.trim());
        setExistingTerm(
          existing
            ? { term: existing.term, definition: existing.definition }
            : null,
        );

        if (existing && !values.definition) {
          setValue("definition", existing.definition);
        }
      } else {
        setExistingTerm(null);
      }
    };

    const timeoutId = setTimeout(checkExisting, 300);
    return () => clearTimeout(timeoutId);
  }, [values.term, values.definition, setValue]);

  async function _handleSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      await insertTerm({
        term: values.term,
        definition: values.definition.replace(/\n/g, "  \n"),
      });

      const isUpdate = existingTerm !== null;
      await showToast({
        style: Toast.Style.Success,
        title: isUpdate
          ? "Term updated successfully"
          : "Term inserted successfully",
        message: isUpdate
          ? `Updated "${values.term}"`
          : `Added "${values.term}"`,
      });

      if (onInsert) {
        onInsert();
      } else {
        popToRoot();
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to insert term" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingTerm ? "Update Term" : "Insert Term"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.term}
        id="term"
        title="Term"
        placeholder="Enter the term"
        autoFocus
      />

      <Form.TextArea
        {...itemProps.definition}
        id="definition"
        title="Definition"
        placeholder="Enter the definition"
      />
    </Form>
  );
}
