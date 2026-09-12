import { useEffect, useState } from 'react';
import { Clipboard, Detail, getSelectedText, showToast, Toast } from '@raycast/api';
import { decode, type DecodeResult, type Success } from './decoder';
import DecodeInput from './decode-input';
import { ResultView } from './result';

async function readSource(): Promise<DecodeResult> {
	let input = '';
	try {
		input = await getSelectedText();
	} catch {
		/* selection unavailable */
	}
	if (!input.trim()) {
		try {
			input = (await Clipboard.readText()) ?? '';
		} catch {
			/* clipboard unavailable */
		}
	}
	return decode(input);
}

export default function DecodeClipboard() {
	const [result, setResult] = useState<Success | null>(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let active = true;
		void readSource().then((value) => {
			if (!active) return;
			if (value.ok) setResult(value);
			else
				void showToast({
					style: Toast.Style.Failure,
					title:
						value.error === 'empty-input'
							? 'Clipboard is empty. Paste a link below.'
							: 'No link found in the selected text or clipboard.'
				});
			setLoading(false);
		});
		return () => {
			active = false;
		};
	}, []);
	if (loading) return <Detail isLoading />;
	return result ? <ResultView result={result} refresh={readSource} /> : <DecodeInput />;
}
