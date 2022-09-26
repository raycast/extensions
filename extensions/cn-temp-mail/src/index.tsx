import { randomUUID } from "crypto";
import {Form, showHUD, Clipboard, open, ActionPanel, Action, showToast, popToRoot} from "@raycast/api";

type Values = {
  textfield: string;
};

export default function Command() {
    async function handleSubmit(values: Values) {
        const username = values.textfield;
        const url = `https://maildrop.cc/inbox/${username}`;
        const email = `${username}@maildrop.cc`;

        showToast({title: "Email created", message: `${email} email copied to clipboard.`}).then();

        await open(url);
        await Clipboard.copy(email);
        await showHUD(`${email} email copied to clipboard.`);
        await popToRoot();
    }

    return (
        <Form actions={
            <ActionPanel>
                <Action.SubmitForm onSubmit={handleSubmit}/>
            </ActionPanel>
        }>
            <Form.Description text="Enter name to get temp mail."/>
            <Form.TextField
                id="textfield"
                title="Username"
                placeholder="Enter username"
                defaultValue={randomUUID()}
            />
        </Form>
    );
}
