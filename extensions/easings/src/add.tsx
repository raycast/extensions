import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";

import { Action, ActionPanel, Form, LocalStorage, showHUD, useNavigation } from "@raycast/api";

import { Easing, State } from "./utils/types";

function validateEasing(value: string): boolean {
  return value.length >= 7;
}

export default function Command() {
  const [title, setTitle] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [value, setValue] = useState<string>("");

  const [titleError, setTitleError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();

  const { pop } = useNavigation();

  function dropTitleError() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function dropValueError() {
    if (valueError && valueError.length > 0) {
      setValueError(undefined);
    }
  }

  const [state, setState] = useState<State>({
    isLoading: true,
    easings: [],
  });

  useEffect(() => {
    (async () => {
      const storedEasings = await LocalStorage.getItem<string>("easings");

      if (!storedEasings) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const easings: Easing[] = JSON.parse(storedEasings);
        setState((previous) => ({ ...previous, easings, isLoading: false }));
      } catch (e) {
        // can't decode easings
        setState((previous) => ({ ...previous, easings: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("easings", JSON.stringify(state.easings));
  }, [state.easings]);

  const handleCreate = useCallback(
    (title: string, type: string, value: string) => {
      let parsedValue;

      if (value.includes("cubic-bezier(")) {
        parsedValue = value.replace("cubic-bezier(", "").replace(")", "").replace(";", "");
      } else if (value.includes("cubicBezier(")) {
        parsedValue = value.replace("cubicBezier(", "").replace(")", "").replace(";", "");
      } else {
        parsedValue = value;
      }

      const newEasings = [...state.easings, { id: nanoid(), title, type, value: parsedValue }];
      setState((previous) => ({ ...previous, easings: newEasings }));
      showHUD(`Successfully saved: ${title}`);
      pop();
    },
    [state.easings, setState],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Custom Easing"
            onSubmit={(values: Easing) => {
              handleCreate(values.title, values.type, values.value);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a name"
        value={title}
        onChange={setTitle}
        error={titleError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("Name can't be empty");
          } else {
            dropTitleError();
          }
        }}
      />
      <Form.Dropdown id="type" title="Type" value={type} onChange={setType}>
        <Form.Dropdown.Item value="in-out" title="Ease In Out" />
        <Form.Dropdown.Item value="in" title="Ease In" />
        <Form.Dropdown.Item value="out" title="Ease Out" />
      </Form.Dropdown>
      <Form.TextField
        id="value"
        title="Value"
        value={value}
        placeholder="1,0.25,0.25,0.5 or cubic-bezier(1,0.25,0.25,0.5)"
        onChange={setValue}
        error={valueError}
        onBlur={(event) => {
          const value = event.target.value;

          if (value && value.length > 0) {
            if (!validateEasing(value)) {
              setValueError("Easing value should be at least 8 characters!");
            } else {
              dropValueError();
            }
          } else {
            setValueError("Easing value can't be empty");
          }
        }}
      />
    </Form>
  );
}
