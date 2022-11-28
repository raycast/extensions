import {Form, ActionPanel, Action, showToast, Toast, showHUD, popToRoot, Clipboard, Detail} from "@raycast/api";
import {useCachedPromise} from "@raycast/utils";
import {useState} from "react";

import {generateJsonFromYaml, isValidYaml} from "./utils";


type CommandFormValues = {
    textarea: string;
    checkbox: boolean;
};

function JsonView(props: { yaml: string }) {
    const {yaml} = props;
    const {data} = useCachedPromise(
            async () => {
                if (!await isValidYaml(yaml)) {
                    return;
                }

                return await generateJsonFromYaml(yaml);
            },
            [],
            {
                initialData: "Some Text",
            }
        );

    return <Detail markdown={"``" + JSON.stringify(data, null, '\t') + "``"}/>;
}

export default function Command() {
    const [yaml, setYaml] = useState<string>("");
    const [minify, setMinify] = useState<boolean>(false);

    async function handleSubmit(values: CommandFormValues) {
        const {textarea, checkbox} = values;

        if (!await isValidYaml(textarea)) {
            return;
        }

        const jsonFromYaml = await generateJsonFromYaml(textarea);
        const jsonResult = checkbox ? JSON.stringify(jsonFromYaml) : JSON.stringify(jsonFromYaml, null, '\t')
        await Clipboard.copy(jsonResult);

        await showHUD("Copied to clipboard");
        await popToRoot();
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleSubmit} title="Generate and copy"/>
                    <Action.Push title="Show generated json" target={<JsonView yaml={yaml}/>}/>
                </ActionPanel>
            }
        >
            <Form.Description text="This form showcases all available form elements."/>
            <Form.TextArea id="textarea" title="Yaml" placeholder="Enter your yaml" value={yaml} onChange={setYaml}/>
            <Form.Checkbox id="checkbox" title="Checkbox" label="Minimize Json" onChange={() => setMinify(!minify)}
                           storeValue={true}/>
        </Form>
    );
}
