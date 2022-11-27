import {Form, ActionPanel, Action, showToast, Toast, showHUD, popToRoot, Clipboard} from "@raycast/api";
import {useState} from "react";
import yamljs from "yamljs";


type CommandFormValues = {
    textarea: string;
    checkbox: boolean;
};

export default function Command() {
    const [minify, setMinify] = useState<boolean>(false);

    async function handleSubmit(values: CommandFormValues) {
        const {textarea, checkbox} = values;

        if (textarea.length === 0) {
            await showToast(Toast.Style.Failure, "Empty Yaml");
            return;
        }

        try {
            const jsonFromYaml = yamljs.parse(textarea);
            const jsonResult = checkbox ? JSON.stringify(jsonFromYaml) : JSON.stringify(jsonFromYaml, null, '\t')
            await Clipboard.copy(jsonResult);
        } catch (e) {
            await showToast(Toast.Style.Failure, "Invalid Yaml");
            return;
        }

        await showHUD("Copied to clipboard");
        await popToRoot();
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleSubmit} title="Generate"/>
                </ActionPanel>
            }
        >
            <Form.Description text="This form showcases all available form elements."/>
            <Form.TextArea id="textarea" title="Yaml" placeholder="Enter your yaml"/>
            <Form.Checkbox id="checkbox" title="Checkbox" label="Minimize Json" onChange={() => setMinify(!minify)}
                           storeValue={true}/>
        </Form>
    );
}
