import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import * as miro from "./oauth/miro";

interface CreateBoardProps {
  name: string;
  description: string;
}

export default function CreateBoard() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nameError, setNameError] = useState<string | undefined>();

  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        await miro.authorize();
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Board"
            onSubmit={async (values: CreateBoardProps) => {
              try {
                await miro.createItem(values.name, values.description);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Board created",
                });
                await launchCommand({ name: "list-boards", type: LaunchType.UserInitiated });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Board creation failed",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Board Name"
        placeholder="Enter your name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextArea id="description" title="Description" placeholder="Enter board description" />
    </Form>
  );
}
