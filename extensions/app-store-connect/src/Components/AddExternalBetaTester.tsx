import { Form, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { betaTestersSchema, App, BetaGroup, BetaTester, usersSchema, User, betaTesterSchema } from "../Model/schemas";
import { useEffect, useState } from "react";
import { presentError } from "../Utils/utils";
import fs from "fs";

interface Props {
    group: BetaGroup;
    app: App;
    didUpdateNewTester: (newTester: BetaTester) => void;
}
interface AddExternalBetaTesterFormValues {
    firstName: string;
    lastName: string;
    email: string;
}
export default function AddExternalBetaTester({ group, app, didUpdateNewTester }: Props) {
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
                            email: values.email
                        },
                        relationships: {
                            betaGroups: {
                                data: [{
                                    type: "betaGroups",
                                    id: group.id
                                }]
                            }
                        }
                    }
                    const response = await fetchAppStoreConnect(`/betaTesters`, "POST", {
                        data: userToAdd
                    });
                    setIsLoading(false);
                    showToast({
                        style: Toast.Style.Success,
                        title: "Success!",
                        message: "Invite sent",
                    });
                    if (response && response.ok) {
                        const json = await response.json();
                        const invited = betaTesterSchema.safeParse(json.data);
                        if (invited.success) {
                            didUpdateNewTester(invited.data);
                        }
                    }
                }
                catch (error) {
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
                    <Action.SubmitForm icon={Icon.Person} title="Invite new tester" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField title="Firstname" {...itemProps.firstName} />
            <Form.TextField title="Lastname" {...itemProps.lastName} />
            <Form.TextField title="Email" {...itemProps.email} />
        </Form>
    )
}