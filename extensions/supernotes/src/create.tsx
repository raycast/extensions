import { Action, ActionPanel, Form } from "@raycast/api";
import React from "react";

import CardDetail from "~/components/CardDetail";
import useCreate from "~/hooks/useCreate";
import type { ICard, ISimpleCard } from "~/utils/types";

const CreateCard = ({ draftValues }: { draftValues?: ISimpleCard }) => {
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
      <Form.TextField
        id="name"
        defaultValue={draftValues?.name}
        title="Name"
        placeholder="The name of the card..."
      />
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
