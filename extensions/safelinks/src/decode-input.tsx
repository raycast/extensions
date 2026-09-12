import { useEffect, useRef, useState } from 'react';
import {
	Action,
	ActionPanel,
	Clipboard,
	Form,
	showToast,
	Toast,
	useNavigation
} from '@raycast/api';
import { decode } from './decoder';
import { ResultView } from './result';

export default function DecodeInput() {
	const [input, setInput] = useState('');
	const [error, setError] = useState<string>();
	const edited = useRef(false);
	const { push } = useNavigation();
	useEffect(() => {
		let active = true;
		void Clipboard.readText()
			.then((text) => {
				if (active && !edited.current) setInput(text ?? '');
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	function submit() {
		const result = decode(input.trim());
		if (!result.ok) {
			const message =
				result.error === 'empty-input' ? 'Paste a link first.' : 'No link found in that text.';
			setError(message);
			void showToast({ style: Toast.Style.Failure, title: message });
			return;
		}
		push(<ResultView result={result} refresh={() => decode(input.trim())} />);
	}
	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Decode Link" onSubmit={submit} />
				</ActionPanel>
			}
		>
			<Form.TextArea
				id="url"
				title="Link or text"
				placeholder="Paste a rewritten link…"
				value={input}
				error={error}
				onChange={(value) => {
					edited.current = true;
					setInput(value);
					setError(undefined);
				}}
				autoFocus
			/>
			<Form.Description text="Decoding is local; the URL is never fetched." />
		</Form>
	);
}
