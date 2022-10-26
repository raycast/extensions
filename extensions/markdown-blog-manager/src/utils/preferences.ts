import { getPreferenceValues } from '@raycast/api';
import { homedir } from 'os';
import { existsSync } from 'fs';

interface Preferences {
	draftsPath: string;
	publicPath: string;
}

export default () => {
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
		values.draftsPath = '';
	}

	if (!existsSync(values.publicPath)) {
		values.publicPath = '';
	}

	return values;
};
