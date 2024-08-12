import { Icon, MenuBarExtra } from '@raycast/api';
import { promises as fs } from 'node:fs';
import { useEffect, useState } from 'react';

export async function openFile(path: string) {
	const file = await fs.readFile(path, 'utf8');
	return file;
}

const useFile = () => {
	const [state, setState] = useState<{ file: string; isLoading: boolean }>({
		file: '',
		isLoading: true,
	});
	useEffect(() => {
		(async () => {
			const file = await openFile('/tmp/devsync.stdout');
			setState({
				file,
				isLoading: false,
			});
		})();
	}, []);
	return state;
};

export default function Command() {
	const { file, isLoading } = useFile();

	let icon = Icon.CheckCircle;
	let lastMessage = 'Cargando estado...';
	let lastDate = 'Cargando fecha...';

	if (!isLoading) {
		const lines = file.split('\n');
		if (lines === undefined || lines.length < 3) {
			return (
				<MenuBarExtra icon={Icon.Warning} isLoading={isLoading}>
					<MenuBarExtra.Item title="Estado de sincronización" />
					<MenuBarExtra.Item title="No se ha encontrado información de sincronización." />
				</MenuBarExtra>
			);
		}
		lastMessage = lines[lines.length - 2];
		lastDate = lines[lines.length - 3];

		if (lastMessage !== 'Sincronización finalizada.') {
			icon = Icon.Clock;
		}
	}

	const info = `${lastDate}: ${lastMessage}`;
	// showHUD(info);
	return (
		<MenuBarExtra icon={icon} isLoading={isLoading} title={lastMessage}>
			<MenuBarExtra.Item title="Estado de sincronización" />
			<MenuBarExtra.Item
				title={info}
				onAction={() => {
					
				}}
			/>
		</MenuBarExtra>
	);
}
