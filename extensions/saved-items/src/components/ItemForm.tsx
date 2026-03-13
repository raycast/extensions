import { useCallback, useState } from "react";
import { Form, Action, ActionPanel, useNavigation, Icon } from "@raycast/api";

type ItemFormProps = {
  id?: string;
  defaultTitle?: string;
  defaultDetail?: string;
  onSubmit: (id: string | undefined, title: string, detail: string) => void;
};

function ItemForm(props: ItemFormProps) {
  const { id, defaultTitle = "", defaultDetail = "", onSubmit } = props;
  const { pop } = useNavigation();

  const [currentTitle, setCurrentTitle] = useState(defaultTitle);
  const [currentDetail, setCurrentDetail] = useState(defaultDetail);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [detailError, setDetailError] = useState<string | undefined>();

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function dropDetailErrorIfNeeded() {
    if (detailError && detailError.length > 0) {
      setDetailError(undefined);
    }
  }

  const handleSubmit = useCallback(() => {
    onSubmit(id, currentTitle, currentDetail);
    pop();
  }, [onSubmit, pop, id, currentTitle, currentDetail]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={id ? "Save Item" : "Create Item"}
            icon={id ? Icon.NewDocument : Icon.PlusTopRightSquare}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={currentTitle}
        error={titleError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("Title shouldn't be empty!");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
        onChange={setCurrentTitle}
      />
      <Form.TextArea
        id="detail"
        title="Detail"
        value={currentDetail}
        placeholder="Details of the saved content"
        enableMarkdown
        info="The Markdown shortcuts are now operational within the TextArea: for instance, pressing ⌘ + B will encase the highlighted text in **bold**, while ⌘ + I will render it in *italic*, among other functionalities."
        error={detailError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDetailError("The field shouldn't be empty!");
          } else {
            dropDetailErrorIfNeeded();
          }
        }}
        onChange={setCurrentDetail}
      />
    </Form>
  );
}

export default ItemForm;
