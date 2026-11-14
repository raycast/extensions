import {
	Action,
	ActionPanel,
	Clipboard,
	Form,
	Icon,
	PopToRootType,
	Toast,
	closeMainWindow,
	showToast,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { appLinkCandidate, openLink } from "../lib/links";
import { ExecutableSource, WorkspaceStatus } from "../lib/models";
import { WorkspaceIcon, workspaceIconImage } from "../lib/workspace-icons";
import { ExecutableView } from "./executable-view";

interface OpenLinkValues {
	url: string;
	workspace: string;
}

export function OpenLinkForm({
	workspaces,
	workspaceIcons = {},
	initialWorkspaceID,
	initialURL,
	executableSource,
	isLoading = false,
	issues = [],
	onRetry,
}: {
	workspaces: WorkspaceStatus[];
	workspaceIcons?: Record<string, WorkspaceIcon>;
	initialWorkspaceID?: string;
	initialURL?: string;
	executableSource?: ExecutableSource;
	isLoading?: boolean;
	issues?: string[];
	onRetry?: () => void;
}) {
	const sorted = [...workspaces].sort((lhs, rhs) => {
		if (lhs.workspace.kind !== rhs.workspace.kind) return lhs.workspace.kind === "primary" ? -1 : 1;
		return lhs.workspace.name.localeCompare(rhs.workspace.name);
	});
	const defaultWorkspaceID =
		initialWorkspaceID ?? sorted.find((workspace) => workspace.isCurrent)?.workspace.id ?? sorted[0]?.workspace.id;

	const { handleSubmit, itemProps, setValue, values } = useForm<OpenLinkValues>({
		initialValues: {
			url: appLinkCandidate(initialURL) ?? initialURL?.trim() ?? "",
			workspace: defaultWorkspaceID ?? "",
		},
		validation: {
			url: FormValidation.Required,
			workspace: FormValidation.Required,
		},
		onSubmit: async ({ url, workspace: workspaceID }) => {
			const workspace = sorted.find((item) => item.workspace.id === workspaceID);
			if (!workspace) return;

			const toast = await showToast({ style: Toast.Style.Animated, title: "Opening link…" });
			try {
				const { data, warnings } = await openLink(workspace.workspace.name, url.trim(), executableSource);
				toast.style = Toast.Style.Success;
				toast.title = data.delivery === "launch" ? "Launched with Link" : "Sent Link";
				toast.message = [
					`${data.workspaceName} · pid ${data.processID}`,
					...warnings.map((warning) => warning.message),
				].join("\n");
				await closeMainWindow({ popToRootType: PopToRootType.Immediate });
			} catch (error) {
				toast.style = Toast.Style.Failure;
				toast.title = "Could Not Open Link";
				toast.message = error instanceof Error ? error.message : String(error);
			}
		},
	});

	// Workspaces load after the form appears in the standalone command, so pick the default once they arrive.
	useEffect(() => {
		if (!values.workspace && defaultWorkspaceID) setValue("workspace", defaultWorkspaceID);
	}, [defaultWorkspaceID]);

	// Pre-fill from the clipboard only when no link was passed in and it holds a Codex link.
	const { isLoading: isReadingClipboard } = usePromise(
		async (hasInitialURL: boolean) => (hasInitialURL ? undefined : appLinkCandidate(await Clipboard.readText())),
		[Boolean(initialURL?.trim())],
		{
			onData: (clipboardURL) => {
				if (clipboardURL && !values.url) setValue("url", clipboardURL);
			},
		},
	);

	if (!isLoading && sorted.length === 0) {
		return (
			<Form
				actions={
					<ActionPanel>
						{onRetry && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />}
						<Action.Push
							title="Manage Executables"
							icon={Icon.Gear}
							target={<ExecutableView onChange={onRetry ?? (() => undefined)} />}
						/>
					</ActionPanel>
				}
			>
				<Form.Description
					title="Workspaces Unavailable"
					text={issues.length > 0 ? issues.join("\n") : "fxCodex did not return any workspaces."}
				/>
			</Form>
		);
	}

	return (
		<Form
			isLoading={isLoading || isReadingClipboard}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Open Link" icon={Icon.Link} onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextField title="Link" placeholder="codex://…" {...itemProps.url} />
			<Form.Dropdown title="Workspace" {...itemProps.workspace}>
				{sorted.map((workspace) => (
					<Form.Dropdown.Item
						key={workspace.workspace.id}
						value={workspace.workspace.id}
						title={workspace.workspace.name}
						icon={workspaceIconImage(
							workspaceIcons[workspace.workspace.id],
							workspace.workspace.kind === "primary" ? Icon.House : Icon.Folder,
						)}
					/>
				))}
			</Form.Dropdown>
			<Form.Description text="The link goes only to this workspace's Codex. A running instance receives it directly; otherwise the workspace launches with it." />
		</Form>
	);
}
