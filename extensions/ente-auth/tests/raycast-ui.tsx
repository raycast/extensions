import { ReactNode } from "react";

// Raycast renders native views. These controls expose the same input and action
// callbacks to React DOM, so tests run real hooks without the Raycast host.
interface ViewProps {
	children?: ReactNode;
	actions?: ReactNode;
	detail?: ReactNode;
	metadata?: ReactNode;
	title?: string;
	navigationTitle?: string;
	subtitle?: string;
	text?: string;
	description?: string;
	markdown?: string;
	isLoading?: boolean;
	enableDrafts?: boolean;
	icon?: unknown;
}

function View(props: ViewProps) {
	return (
		<section
			aria-label={props.title ?? props.navigationTitle}
			aria-busy={props.isLoading ?? false}
			data-enable-drafts={props.enableDrafts}
			data-icon={props.icon === undefined ? undefined : JSON.stringify(props.icon)}
		>
			{props.title && <h2>{props.title}</h2>}
			{props.subtitle && <p>{props.subtitle}</p>}
			{props.text && <span>{props.text}</span>}
			{props.description && <p>{props.description}</p>}
			{props.markdown && <p>{props.markdown}</p>}
			{props.children}
			{props.detail}
			{props.metadata}
			{props.actions}
		</section>
	);
}

interface ActionProps {
	title: string;
	onAction?: () => unknown;
	onSubmit?: () => unknown;
	onCopy?: () => unknown;
	onPaste?: () => unknown;
	content?: string;
	concealed?: boolean;
}

function Button({ title, onAction, onSubmit, onCopy, onPaste, content, concealed }: ActionProps) {
	return (
		<button
			type="button"
			data-content={content}
			data-concealed={concealed}
			onClick={() => void (onAction ?? onSubmit ?? onCopy ?? onPaste)?.()}
		>
			{title}
		</button>
	);
}

interface FieldProps {
	id: string;
	title: string;
	value: string;
	onChange: (value: string) => void;
	storeValue?: boolean;
	password?: boolean;
	placeholder?: string;
}

function Field({ id, title, value, onChange, storeValue, password, placeholder }: FieldProps) {
	return (
		<label>
			{title}
			<input
				id={id}
				type={password ? "password" : "text"}
				value={value}
				placeholder={placeholder}
				data-store-value={storeValue}
				onChange={(event) => onChange(event.currentTarget.value)}
			/>
		</label>
	);
}

function Link({ title, text, target }: { title: string; text: string; target: string }) {
	return (
		<a href={target}>
			{title}: {text}
		</a>
	);
}

export const Action = Object.assign(Button, {
	SubmitForm: Button,
	CopyToClipboard: Button,
	Paste: Button,
	Style: { Destructive: "destructive" },
});
export const ActionPanel = Object.assign(View, { Section: View });
export const Form = Object.assign(View, {
	Description: View,
	TextField: Field,
	PasswordField: (props: FieldProps) => <Field {...props} password />,
});
const Metadata = Object.assign(View, {
	Label: View,
	Link,
	Separator: () => <hr />,
	TagList: Object.assign(View, { Item: View }),
});
export const Detail = Object.assign(View, { Metadata });
export const List = Object.assign(View, {
	EmptyView: View,
	Section: View,
	Item: Object.assign(View, { Detail: Object.assign(View, { Metadata }) }),
});
export const Icon = { Key: "key", ExclamationMark: "warning" };
export const Keyboard = { Shortcut: { Common: { New: {}, Refresh: {} } } };
