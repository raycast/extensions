import { Detail, openExtensionPreferences, ActionPanel, Action } from '@raycast/api';
import { getPreferenceValues } from '@raycast/api';
import { homedir } from 'os';
import { existsSync } from 'fs';

interface Preferences {
	draftsPath: string;
	publicPath: string;
}

export const getPreferences = () => {
	const values = getPreferenceValues<Preferences>();

	values.draftsPath = values.draftsPath.replace('~/', `${homedir()}/`);
	values.publicPath = values.publicPath.replace('~/', `${homedir()}/`);

	// remove trailing slash
	if (values.draftsPath.endsWith('/')) {
		values.draftsPath = values.draftsPath.slice(0, -1);
	}
	if (values.publicPath.endsWith('/')) {
		values.publicPath = values.publicPath.slice(0, -1);
	}

	if (!existsSync(values.draftsPath)) {
		throw new Error(`${values.draftsPath} does not exist`);
	}

	if (!existsSync(values.publicPath)) {
		throw new Error(`${values.publicPath} does not exist`);
	}

	return values;
};

export const ValidatePreferences = (props: { children: JSX.Element }) => {
	try {
		getPreferences();
		return props.children;
	} catch (error: unknown) {
		if (error instanceof Error) {
			const values = getPreferenceValues<Preferences>();
			const pathsNotFound = [values.draftsPath, values.publicPath]
				.filter((path) => !existsSync(path))
				.map((v) => ' * `' + v + '`')
				.join('\n\n');

			const markdown = `
			🧨 **Error: Settings need a tweak**

			One or more of the paths set in the extension preferences couldn't be found.
			Please make sure that you've set the correct paths and try again.
		
			Paths that couldn't be found:

			${pathsNotFound}

			👉 **Use shortcut \`⌘ + P\` to open extension preferences** and change the configured paths.
			`
				.trim()
				.split('\n')
				.map((line) => line.trim())
				.join('\n');
			return (
				<Detail
					markdown={markdown}
					actions={
						<ActionPanel title="#1 in raycast/extensions">
							<Action
								onAction={openExtensionPreferences}
								shortcut={{ modifiers: ['cmd'], key: 'p' }}
								title="Open Preferences"
							/>
						</ActionPanel>
					}
				/>
			);
		}
		return <Detail markdown="An unknown error occurred." />;
	}
};
