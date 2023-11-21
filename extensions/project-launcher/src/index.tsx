import { Form, ActionPanel, Action, showToast, open } from '@raycast/api';
import { getDirectories, getProjectDirectory } from './helpers';

type Values = {
    project: string;
    php: string;
    editor: string;
    gitPull: boolean;
};

export default function Command() {
    const directories = getDirectories();

    function handleSubmit(values: Values) {
        open('http://local' + values.php + '.' + getProjectDirectory(values.project));

        const { exec } = require('child_process');
        exec(values.editor + ' ' + values.project);
        showToast({ title: 'Opening project', message: 'Opening project...' });

        if (values.gitPull) {
            exec('cd ' + values.project + ' && git pull');
            showToast({ title: 'Pulling latest commits', message: 'Pulling latest commits...' });
        }
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.Description text="Choose a project to start development" />
            <Form.Separator />
            <Form.Dropdown id="project" title="Project" isLoading={directories.length === 0} storeValue>
                {directories.map((directory) => {
                    return <Form.Dropdown.Item value={directory.dir} title={directory.label} key={directory.label} />;
                })}
            </Form.Dropdown>
            <Form.Dropdown id="php" title="PHP" defaultValue="81" storeValue>
                <Form.Dropdown.Item value="74" title="php74" />
                <Form.Dropdown.Item value="81" title="php80/81" />
            </Form.Dropdown>
            <Form.Dropdown id="editor" title="Editor" defaultValue="cursor" storeValue>
                <Form.Dropdown.Item value="vscode" title="VS Code" />
                <Form.Dropdown.Item value="cursor" title="Cursor" />
            </Form.Dropdown>
            <Form.Checkbox id="gitPull" label="Git Pull" defaultValue={false} storeValue />
        </Form>
    );
}
