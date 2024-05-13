import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { IS_CLOUD, umami } from "./lib/umami";
import useUmami from "./lib/useUmami";
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { UmamiMe, UmamiUpdateMyPassword } from "./lib/types";

export default function Me() {
    const { push } = useNavigation();
    const { isLoading, data, error } = useUmami<UmamiMe>(umami.getMe());

    const markdown = data ? Object.entries(data).map(([key, value]) => `${key} = ${value}`).join('\n\n') : "";

    async function pushUpdateMyPassword() {
        if (IS_CLOUD) {
            await showFailureToast("Not available in Umami Cloud", {
                title: "ERROR"
            });
        } else {
            // push(<UpdateMyPassword />)
        }
    }

    return error ? <ErrorComponent error={error} /> : <Detail isLoading={isLoading} markdown={markdown} actions={!data ? undefined : <ActionPanel>
        <Action title="Update My Password" onAction={pushUpdateMyPassword} />
    </ActionPanel>} />;
}

// function UpdateMyPassword() {
//     const { isLoading, data, error } = useUmami<>(umami.updateMyPassword());
    
//     const { handleSubmit, itemProps } = useForm<UmamiUpdateMyPassword>({
//         onSubmit(values) {

//         },
//         validation: {
//             currentPassword: FormValidation.Required,
//             newPassword: FormValidation.Required
//         }
//     });

//     <Form navigationTitle="Update My Password" actions={<ActionPanel>
//         <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
//     </ActionPanel>}>
//         <Form.PasswordField title="Current Password" {...itemProps.currentPassword} />
//         <Form.PasswordField title="New Password" {...itemProps.newPassword} />
//     </Form>
// }