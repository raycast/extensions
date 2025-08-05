import { Form, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { BetaGroup, BetaTester, betaTesterSchema } from "../Model/schemas";
import { useState } from "react";
import { presentError } from "../Utils/utils";

interface Props {
  group: BetaGroup;
  didUpdateNewTester: (newTester: BetaTester) => void;
}
interface AddExternalBetaTesterFormValues {
  firstName: string;
  lastName: string;
  email: string;
}
export default function AddExternalBetaTester({ group, didUpdateNewTester }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<AddExternalBetaTesterFormValues>({
    onSubmit(values) {
      (async () => {
        setIsLoading(true);
        try {
          const userToAdd = {
            type: "betaTesters",
            attributes: {
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
            },
            relationships: {
              betaGroups: {
                data: [
                  {
                    type: "betaGroups",
                    id: group.id,
                  },
                ],
              },
            },
          };
          const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
            data: userToAdd,
          });
          setIsLoading(false);
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Invite sent",
          });
          if (response && response.ok) {
            try {
              const json = await response.json();
              const invited = betaTesterSchema.safeParse(json.data);
              if (invited.success) {
                didUpdateNewTester(invited.data);
              }
            } catch (error) {
              console.log(error);
            }
          }
        } catch (error) {
          setIsLoading(false);
          presentError(error);
        }
      })();
    },
    validation: {
      email: FormValidation.Required,
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Person} title="Invite New Tester" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Firstname" {...itemProps.firstName} />
      <Form.TextField title="Lastname" {...itemProps.lastName} />
      <Form.TextField title="Email" {...itemProps.email} />
    </Form>
  );
}
