import { Action, ActionPanel, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { insertNode } from "../lib/api";
import { insertNodeOptimistically } from "../lib/cache";
import { listCaptureDestinationOptions, resolveDefaultCaptureDestination, type DestinationOption } from "../lib/capture-options";
import { getPreferences } from "../lib/preferences";
import type { CaptureType } from "../lib/nodes";

interface Props {
  fixedDestination?: {
    title: string;
    target: string;
    targetNodeId?: string | null;
  };
  initialText?: string;
  initialDestinationValue?: string;
  initialType?: CaptureType;
  onDidCreate?: () => void;
  returnToRootOnSuccess?: boolean;
}

export function QuickCaptureForm({ fixedDestination, initialText, initialDestinationValue, initialType, onDidCreate, returnToRootOnSuccess = true }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferences();
  const { pop } = useNavigation();
  const options = useMemo(listCaptureDestinationOptions, []);

  const defaultDestination = useMemo(
    () => resolveDefaultCaptureDestination(preferences.quickCaptureDefaultTarget),
    [preferences.quickCaptureDefaultTarget],
  );
  const defaultDestinationValue =
    initialDestinationValue ??
    options.find((option) => option.value === defaultDestination.value)?.value ??
    options.find((option) => option.target === defaultDestination.target)?.value ??
    options.find((option) => option.target === "inbox")?.value ??
    options[0]?.value;

  const groupedOptions = useMemo(() => {
    const map = new Map<DestinationOption["section"], DestinationOption[]>();
    for (const option of options) {
      const existing = map.get(option.section) ?? [];
      existing.push(option);
      map.set(option.section, existing);
    }
    return map;
  }, [options]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Capture Item"
            onSubmit={async (values: { text: string; note?: string; type: string; destination?: string }) => {
              const text = values.text?.trim();
              if (!text) {
                await showToast({ style: Toast.Style.Failure, title: "Enter some text" });
                return;
              }

              const selectedDestination =
                fixedDestination ?? options.find((option) => option.value === values.destination) ?? options[0];
              if (!selectedDestination) {
                await showToast({ style: Toast.Style.Failure, title: "Choose a destination" });
                return;
              }

              try {
                setIsLoading(true);
                const result = await insertNode(preferences.apiKey, {
                  target: selectedDestination.target,
                  targetNodeId: selectedDestination.targetNodeId,
                  text,
                  note: values.note?.trim() || undefined,
                  position: preferences.capturePosition,
                  type: (values.type as CaptureType) || "bullet",
                });

                if (result.id && result.parentId) {
                  insertNodeOptimistically({
                    id: result.id,
                    name: text,
                    note: values.note?.trim() || null,
                    parentId: result.parentId,
                  });
                }

                onDidCreate?.();
                await showToast({ style: Toast.Style.Success, title: `Added to ${selectedDestination.title}` });
                if (returnToRootOnSuccess) {
                  await popToRoot();
                } else {
                  await pop();
                }
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not add item",
                  message: error instanceof Error ? error.message : String(error),
                });
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" placeholder="Task or note..." defaultValue={initialText} />
      {!fixedDestination ? (
        <Form.Dropdown id="destination" title="Destination" defaultValue={defaultDestinationValue} filtering>
          {[...groupedOptions.entries()].map(([section, sectionOptions]) => (
            <Form.Dropdown.Section key={section} title={section}>
              {sectionOptions.map((option) => (
                <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea id="note" placeholder="Optional note" />
      <Form.Dropdown id="type" title="Type" defaultValue={initialType ?? preferences.quickCaptureDefaultType}>
        <Form.Dropdown.Item value="bullet" title="Bullet" />
        <Form.Dropdown.Item value="todo" title="Todo" />
      </Form.Dropdown>
    </Form>
  );
}
