import {
    Action,
    ActionPanel,
    Clipboard,
    Detail,
    Form,
    LocalStorage,
    openExtensionPreferences,
    useNavigation
} from "@raycast/api";
import {sdk} from "./client";
import {UserFragment} from "./graphql";

interface LoginValues {
    email: string;
    password: string;
}

const Success = ({user}: { user: UserFragment }) => {
    return (
        <Detail
            actions={
                <ActionPanel>
                    <Action title="Open prefs" onAction={() => {
                        return openExtensionPreferences()
                    }}/>
                </ActionPanel>
            }
            markdown={`# Hello ${user.profile?.name}
You are now logged in to Kitt
Please open the extension preferences and paste your token in the \`authToken\` field. The token is in your clipboard.
        `}/>
    )
}

export default function Command() {
    const nav = useNavigation()
    const onSubmit = async (values: LoginValues) => {
        const res = await sdk.loginUser(values)
        const token = res.data?.usersvc_LoginCommand?.token;
        if (!token) {
            return;
        }
        await LocalStorage.setItem('x-auth-token', token);
        const uRes = await sdk.getUser({
            token,
            id: "",
        })

        if (!uRes.data.usersvc_GetUser) {
            return;
        }
        await Clipboard.copy(token);
        nav.push(<Success user={uRes.data.usersvc_GetUser}/>);
    }
    return (
        <Form navigationTitle="Login to Kitt" actions={
            <ActionPanel>
                <Action.SubmitForm onSubmit={onSubmit} title="Login"/>
            </ActionPanel>
        }>
            <Form.TextField title="Email" id="email" autoFocus/>
            <Form.PasswordField title="Password" id="password"/>
        </Form>
    )
}