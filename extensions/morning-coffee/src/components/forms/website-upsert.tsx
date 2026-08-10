import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";

interface FormWebsiteUpsertInterface {
  defaultUrl?: string;
  onCreate?: (url: string) => void;
  onEdit?: (url: string) => void;
}

export const FormWebsiteUpsert = ({ defaultUrl, onCreate, onEdit }: FormWebsiteUpsertInterface) => {
  const [urlError, setUrlError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  const handleSubmit = useCallback(
    (values: { url: string }) => {
      if (
        values.url.match(
          /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/
        )
      ) {
        if (onCreate) {
          onCreate(values.url);
          pop();
        }
        if (onEdit) {
          onEdit(values.url);
          pop();
        }
      } else {
        setUrlError("Please enter valid URL");
      }
    },
    [onCreate, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          {onCreate && <Action.SubmitForm title="Add Website" icon={Icon.PlusCircle} onSubmit={handleSubmit} />}
          {onEdit && <Action.SubmitForm title="Edit Website" icon={Icon.Pencil} onSubmit={handleSubmit} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        defaultValue={defaultUrl}
        error={urlError}
        onChange={() => dropUrlErrorIfNeeded()}
      />
    </Form>
  );
};

export default FormWebsiteUpsert;
