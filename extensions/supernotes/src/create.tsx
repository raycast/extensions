import React from "react";

import { Action, ActionPanel, Form } from "@raycast/api";

import useCreate, { SimpleCardData } from "hooks/useCreate";
import { ICard } from "utils/types";

import CardDetail from "components/CardDetail";

const CreateCard = ({ draftValues }: { draftValues?: SimpleCardData }) => {
  const [markupError, setMarkupError] = React.useState<string | undefined>();
  const [createdCard, setCreatedCard] = React.useState<ICard>();

  const dropNameErrorIfNeeded = () => {
    if (markupError && markupError.length > 0) {
      setMarkupError(undefined);
    }
  };

  const { create, loading } = useCreate(setCreatedCard);

  return createdCard ? (
    <CardDetail card={createdCard} />
  ) : (
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
