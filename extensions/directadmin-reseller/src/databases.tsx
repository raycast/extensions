import { Action, ActionPanel, Alert, Color, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { createDatabase, deleteDatabase, getDatabases } from "./utils/api";
import { CreateDatabaseRequest, GetDatabasesResponse, SuccessResponse } from "./types";
import { FormValidation, useForm } from "@raycast/utils";
import { RESELLER_USERNAME } from "./utils/constants";

export default function Databases() {
    const { push } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [databases, setDatabases] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true);
        const response = await getDatabases();
        
        if (response.error==="0") {
            const data = response as GetDatabasesResponse;
            const { list } = data;
            setDatabases(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Databases`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    async function confirmAndDeleteDatabase(database: string) {
        if (
            await confirmAlert({
                title: `Delete database '${database}'?`,
                message: "This action cannot be undone.",
                icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive }
            })
        ) {
            const response = await deleteDatabase({ action: "delete", select0: database })
            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                await getFromApi();
            }
        }
    }

    return <List isLoading={isLoading}>
        {databases && databases.map(database => <List.Item key={database} title={database} icon={Icon.Coin} actions={<ActionPanel>
            <Action title="Delete Database" icon={Icon.DeleteDocument} style={Action.Style.Destructive} onAction={() => confirmAndDeleteDatabase(database)} />
            <ActionPanel.Section>
                <Action title="Create Database" icon={Icon.Plus} onAction={() => push(<CreateDatabase onDatabaseCreated={getFromApi} />)} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Create Database" icon={Icon.Plus} actions={<ActionPanel>
                <Action title="Create Database" icon={Icon.Plus} onAction={() => push(<CreateDatabase onDatabaseCreated={getFromApi} />)} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type CreateDatabaseProps = {
    onDatabaseCreated: () => void;
}
function CreateDatabase({ onDatabaseCreated }: CreateDatabaseProps) {
    const { pop } = useNavigation();

    const { handleSubmit, itemProps } = useForm<CreateDatabaseRequest>({
        async onSubmit(values) {
            const response = await createDatabase({ ...values, action: "create" });

            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                onDatabaseCreated();
                pop();
            }
        },
        validation: {
          name: FormValidation.Required,
          user: FormValidation.Required,
          passwd(value) {
            if (!value)
                return "The item is required";
            else if (itemProps.passwd2.value && itemProps.passwd2.value!==value)
                return "Passwords do not match";
          },
          passwd2(value) {
            if (!value)
                return "The item is required";
            else if (itemProps.passwd.value && itemProps.passwd.value!==value)
                return "Passwords do not match";
          }
        },
      });

    return <Form navigationTitle="Create Database" actions={<ActionPanel>
        <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
    </ActionPanel>}>
        <Form.TextField title="Database Name" placeholder="db" {...itemProps.name} />
        <Form.Description text={`${RESELLER_USERNAME}_${itemProps.name.value || ""}`} />
        <Form.TextField title="Database User" placeholder="user" {...itemProps.user} />
        <Form.Description text={`${RESELLER_USERNAME}_${itemProps.user.value || ""}`} />
        <Form.PasswordField title="Database Password" placeholder="hunter2" {...itemProps.passwd} />
        <Form.PasswordField title="Confirm Password" placeholder="hunter2" {...itemProps.passwd2} />
    </Form>
}