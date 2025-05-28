import { Action, ActionPanel, Form, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import Projects from "./projects";
import { createContext, JSX } from "react";

interface Token {
    key: string;
    url: string;
    name: string;
}

export const TokenContext = createContext<{ url: string; headers }>({});
function TokenProvider({token, children}: {token: Token; children: JSX.Element}) {
    const url = new URL("api/", token.url).toString();
    const headers = {
                        "Content-Type": "application/json",
                        "x-api-key": token.key
                    }
    return <TokenContext.Provider value={{ url, headers }}>
        {children}
    </TokenContext.Provider>
}

export default function APIKeys() {
    const { isLoading, value: tokens = [] } = useLocalStorage<Token[]>("tokens")
    return <List>
        {!isLoading && !tokens.length ? <List.EmptyView actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Token" target={<AddToken />} />
        </ActionPanel>} />
        : tokens.map(token => <List.Item key={token.key} icon={Icon.Key} title={token.name} subtitle={token.url} actions={<ActionPanel>
            <Action.Push icon={Icon.Folder} title="Projects" target={<TokenProvider token={token}><Projects /></TokenProvider>} />
        </ActionPanel>} />)}
    </List>
}

function AddToken() {
    const { value = [], setValue } = useLocalStorage<Token[]>("tokens")
    const {handleSubmit, itemProps} = useForm<Token>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
            try {
                const res = await fetch(new URL("api/user.all", values.url).toString(), {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": values.key
                    },
                });
                if (!res.ok) throw new Error(res.statusText);
                await setValue([...value, values]);
                toast.style = Toast.Style.Success;
                toast.title = "Added";
                await popToRoot();
            } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Could not add"
                toast.message = `${error}`;
            }
        },
        validation: {
            key: FormValidation.Required,
            url(value) {
                if (!value) return "The item is required";
                try {
                    new URL(value);
                } catch {
                    return "The item must be a valid URL";
                }
            },
            name: FormValidation.Required
        }
    })
    return <Form actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Plus} title="Verify & Add" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Name" {...itemProps.name} />
        <Form.TextField title="Instance URL" placeholder="https://dokploy.example.com/" {...itemProps.url} />
        <Form.PasswordField title="API Key" {...itemProps.key} />
    </Form>
}