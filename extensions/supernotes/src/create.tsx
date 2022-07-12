import React from "react";

import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

import CardDetail from "./components/CardDetail";
import useCreate, { SimpleCardData } from "./hooks/useCreate";

const CreateCard = ({ draftValues }: { draftValues?: SimpleCardData }) => {
  const { push, pop } = useNavigation();
  const [markupError, setMarkupError] = React.useState<string | undefined>();

  const dropNameErrorIfNeeded = () => {
    if (markupError && markupError.length > 0) {
      setMarkupError(undefined);
    }
  };

  const { create, loading } = useCreate((card) => {
    pop();
    push(<CardDetail card={card} />);
  });

  return (
    <Form
      enableDrafts
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={create} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue={draftValues?.name} title="Name" placeholder="The name of the card..." />
      <Form.TextArea
        id="markup"
        defaultValue={draftValues?.markup}
        title="Content"
        placeholder="Add markdown content..."
        enableMarkdown
        error={markupError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setMarkupError("Required");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
};

export default CreateCard;
