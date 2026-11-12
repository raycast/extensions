import { useEffect, useState } from 'react';

export function useLoad<T>(load: () => Promise<T>) {
	const [data, setData] = useState<T>();
	const [error, setError] = useState<unknown>();
	const [busy, setBusy] = useState(true);
	const [revision, setRevision] = useState(0);
	useEffect(() => {
		let current = true;
		setBusy(true);
		setError(undefined);
		setData(undefined);
		load()
			.then((value) => {
				if (current) setData(value);
			})
			.catch((value) => {
				if (current) setError(value);
			})
			.finally(() => {
				if (current) setBusy(false);
			});
		return () => {
			current = false;
		};
	}, [load, revision]);
	return { data, error, busy, set: setData, reload: () => setRevision((value) => value + 1) };
}
