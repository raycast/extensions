import {
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  Form,
  Icon,
  showHUD,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL, axiosErrorHandler, useCapacitiesStore } from "./helpers/storage";
import ErrorView from "./components/ErrorView";

interface SaveToDailyNoteBody {
  spaceId: string;
  mdText: string;
  noTimeStamp: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const { store, triggerLoading, isLoading: storeIsLoading, error } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const spacesDropdown = useRef(null);

  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, setValue } = useForm<SaveToDailyNoteBody>({
    async onSubmit(values) {
      setIsLoading(true);
      const body = {
        spaceId: store?.spaces.length === 1 ? store.spaces[0].id : values.spaceId,
        mdText: values.mdText,
        origin: "commandPalette",
        noTimeStamp: values.noTimeStamp,
      };

      axios
        .post(`${API_URL}/save-to-daily-note`, body, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${preferences.bearerToken}`,
            "Content-Type": "application/json",
          },
        })
        .then(() => {
          popToRoot();
        })
        .catch((e) => {
          showHUD(axiosErrorHandler(e));
        });

      closeMainWindow();
    },
    validation: {
      mdText: FormValidation.Required,
      spaceId: spacesDropdown.current ? FormValidation.Required : undefined,
    },
  });

  return error ? (
    <ErrorView error={error} />
  ) : isLoading ? (
    <Detail markdown="Saving weblink ..." isLoading />
  ) : (
    <Form
      isLoading={storeIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Daily Note" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" placeholder="Daily Note" {...itemProps.mdText} />
      {store && store.spaces.length > 1 && (
        <>
          <Form.Dropdown
            title="Space"
            {...itemProps.spaceId}
            storeValue
            onChange={() => setValue("spaceId", "")}
            ref={spacesDropdown}
          >
            {store.spaces &&
              store.spaces.map((space) => <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} />)}
          </Form.Dropdown>
        </>
      )}
      <Form.Checkbox
        label="No Timestamp"
        info="If checked, no time stamp will be added to the note"
        storeValue
        {...itemProps.noTimeStamp}
      />
    </Form>
  );
}
