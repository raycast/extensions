import { ActionPanel, Icon, List } from "@raycast/api";
import { useTallyPaginated } from "./tally";
import { Form } from "./interfaces";
import OpenInTally from "./open-in-tally";

export default function Forms() {
    const { isLoading, data: forms } = useTallyPaginated<Form>("forms");
    return <List isLoading={isLoading}>
        {forms.map(form => <List.Item key={form.id} icon={Icon.TextInput} title={form.name} accessories={[
            {tag: form.status},
            {date: new Date(form.updatedAt), tooltip: `Edited ${form.updatedAt}`}
        ]} actions={<ActionPanel>
            <OpenInTally route={`forms/${form.id}`} />
        </ActionPanel>} />)}
    </List>
}