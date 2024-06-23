import { useEffect, useState } from "react";
import { AddDatabaseFormValues, ListDatabasesResponse } from "../types/databases";
import { addUserDatabase, deleteUserDatabase, getUserDatabases, suspendAllUserDatabases, suspendUserDatabase, unususpendAllUserDatabases, unususpendUserDatabase } from "../api";
import { Action, ActionPanel, Alert, Color, Form, Icon, List, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { getTextAndIconFromVal } from "../utils";
import { FormValidation, useForm } from "@raycast/utils";
import { DB_PASS_REGEX } from "../constants";

type ListDatabasesComponentProps = {
    user: string;
}
export default function ListDatabasesComponent({ user }: ListDatabasesComponentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [databases, setDatabases] = useState<ListDatabasesResponse>();

    const getFromApi = async () => {
        const response = await getUserDatabases(user);
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Fetched ${Object.keys(response).length} databases`
            })
            setDatabases(response)
        };
        setIsLoading(false);
    }
    useEffect(() => {
        getFromApi();
    }, []);

    async function suspendDatabase(database: string) {
        setIsLoading(true);
        const response = await suspendUserDatabase(user, database);
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Suspended ${database}`
            })
            await getFromApi();
        }
        setIsLoading(false);
    }
    async function unsuspendDatabase(database: string) {
        setIsLoading(true);
        const response = await unususpendUserDatabase(user, database);
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Unsuspended ${database}`
            })
            await getFromApi();
        }
        setIsLoading(false);
    }
    async function suspendAllDatabases() {
        setIsLoading(true);
        const response = await suspendAllUserDatabases(user);
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Suspended All Databases`
            })
            await getFromApi();
        }
        setIsLoading(false);
    }
    async function unsuspendAllDatabases() {
        setIsLoading(true);
        const response = await unususpendAllUserDatabases(user);
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Unsuspended All Databases`
            })
            await getFromApi();
        }
        setIsLoading(false);
    }

    async function confirmAndDeleteDatabase(database: string) {
        setIsLoading(true);
        if (
          await confirmAlert({
            title: `Delete database '${database}'?`,
            message: "This action cannot be undone.",
            icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          const response = await deleteUserDatabase(user, database);
          if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Deleted database '${database}'`
                })
                await getFromApi();
            };
        }
        setIsLoading(false);
      }
    
    return <List navigationTitle="List Databases" isLoading={isLoading} isShowingDetail>
        {databases && Object.entries(databases).map(([database, data]) => <List.Item key={database} title={database} icon={{ source: Icon.Coin, tintColor: data.SUSPENDED==="yes" ? Color.Yellow : Color.Green }} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
            {Object.entries(data).map(([key, val]) => {
                const { text: iconText, icon } = getTextAndIconFromVal(val);
                let text = iconText;
                if (key==="U_DISK") text += " mb";
                return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />
            })}
        </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard as JSON" icon={Icon.Clipboard} content={JSON.stringify(data)} />
            <ActionPanel.Section>
                {data.SUSPENDED==="no" && <Action title="Suspend Database" icon={Icon.Pause} onAction={() => suspendDatabase(database)} />}
                {data.SUSPENDED==="yes" && <Action title="Unsuspend Database" icon={Icon.Play} onAction={() => unsuspendDatabase(database)} />}
                <Action title="Delete Database" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => confirmAndDeleteDatabase(database)} />
            </ActionPanel.Section>
            <ActionPanel.Section>
                <Action title="Suspend All Databases" icon={{ source: Icon.PauseFilled, tintColor: Color.Yellow }} onAction={suspendAllDatabases} />
                <Action title="Unsuspend All Databases" icon={{ source: Icon.PlayFilled, tintColor: Color.Green }} onAction={unsuspendAllDatabases} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Add Database" icon={Icon.Plus} actions={<ActionPanel>
                <Action.Push title="Add Database" icon={Icon.Plus} target={<AddDatabase user={user} onDatabaseAdded={getFromApi} />} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type AddDatabaseProps = {
    user: string;
    onDatabaseAdded: () => void;
}
function AddDatabase({ user, onDatabaseAdded }: AddDatabaseProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { pop } = useNavigation();

    const { handleSubmit, itemProps } = useForm<AddDatabaseFormValues>({
        async onSubmit(values) {
            setIsLoading(true);
            const response = await addUserDatabase({...values, user});
            if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Added ${values.database}`
                });
                onDatabaseAdded();
                pop();
            };
            setIsLoading(false);
        },
        validation: {
            database: FormValidation.Required,
            db_user(value) {
                if (!value) return "The item is required";
                else if (user.concat("_", value).length>32) return "The item must be less than 32 characters";
            },
            db_pass(value) {
                if (!value) return "The item is required";
                else if (value.length<8) return "The item must be at least 8 characters";
                else if (!DB_PASS_REGEX.test(value)) return "The item is invalid";
            },
        },
    });

    return <Form navigationTitle="Add Database" isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.Description text={`Prefix ${user}_ will be automatically added to database name and database user`} />
        <Form.TextField title="Database" placeholder="wordpress_db" {...itemProps.database} />
        <Form.TextField title="Username" placeholder="wp_user" {...itemProps.db_user} info="Maximum 32 characters length, including prefix" />
        <Form.PasswordField title="Password" placeholder="Hunter2_" {...itemProps.db_pass} />
        <Form.Description text={`Your password must have at least:
    8 characters
    1 uppercase & 1 lowercase character
    1 number
`} />
    </Form>
}