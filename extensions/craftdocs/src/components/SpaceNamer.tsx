import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { SpaceSQLite } from "../Config";
import useNamedSpaces from "../hooks/useNamedSpaces";
import { useState } from "react";

export type SpaceNamerProps = {
  sqLiteSpace: SpaceSQLite;
};

type FormProps = {
  name: string;
};

export const SpaceNamer = ({ sqLiteSpace }: SpaceNamerProps) => {
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const { pop } = useNavigation();
  const { namedSpaces, namedSpacesLoading, namedSpacesUpsert } = useNamedSpaces();

  const existingSpace = namedSpaces.find((s) => s.id === sqLiteSpace.spaceID);

  const resetNameError = () => nameError && setNameError(undefined);

  return (
    <Form
      isLoading={namedSpacesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={({ name }: FormProps) => {
              name = name.trim();

              if (name.length === 0) {
                setNameError("Name cannot be empty");

                return;
              }

              namedSpacesUpsert({ name, id: sqLiteSpace.spaceID }).then(pop);
            }}
          />
          <Action.Open
            title={`Open Space's Today`}
            target={`craftdocs://openByQuery?query=today&spaceId=${sqLiteSpace.spaceID}`}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Naming space ID ${name(sqLiteSpace)}`} />
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={existingSpace?.name}
        error={nameError}
        onChange={resetNameError}
      />
    </Form>
  );
};

const name = ({ spaceID, primary }: SpaceSQLite) => {
  const postfix = primary ? "(primary)" : "";

  return [spaceID, postfix].filter((str) => str.length > 0).join(" ");
};
