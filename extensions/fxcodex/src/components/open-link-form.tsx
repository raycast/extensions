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
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { appLinkCandidate, openLink } from "../lib/links";
import { ExecutableSource, WorkspaceStatus } from "../lib/models";
import { WorkspaceIcon, workspaceIconImage } from "../lib/workspace-icons";

export function OpenLinkForm({
	workspaces,
	workspaceIcons = {},
	initialWorkspaceID,
	initialURL,
	executableSource,
	isLoading = false,
}: {
	workspaces: WorkspaceStatus[];
	workspaceIcons?: Record<string, WorkspaceIcon>;
	initialWorkspaceID?: string;
	initialURL?: string;
	executableSource?: ExecutableSource;
	isLoading?: boolean;
}) {
	const [url, setURL] = useState(appLinkCandidate(initialURL) ?? initialURL?.trim() ?? "");
	const [urlError, setURLError] = useState<string>();
	const [workspaceID, setWorkspaceID] = useState<string>();

	// Pre-fill from the clipboard only when no link was passed in and it holds a Codex link.
	const { isLoading: isReadingClipboard } = usePromise(
		async (hasInitialURL: boolean) => (hasInitialURL ? undefined : appLinkCandidate(await Clipboard.readText())),
		[Boolean(initialURL?.trim())],
		{
			onData: (clipboardURL) => {
				if (clipboardURL) setURL((current) => current || clipboardURL);
			},
		},
	);

	const sorted = [...workspaces].sort((lhs, rhs) => {
		if (lhs.workspace.kind !== rhs.workspace.kind) return lhs.workspace.kind === "primary" ? -1 : 1;
		return lhs.workspace.name.localeCompare(rhs.workspace.name);
	});
	const defaultWorkspaceID =
		initialWorkspaceID ?? sorted.find((workspace) => workspace.isCurrent)?.workspace.id ?? sorted[0]?.workspace.id;
	const selectedWorkspaceID = workspaceID ?? defaultWorkspaceID;

	async function submit() {
		const link = url.trim();
		if (!link) {
			setURLError("Enter a link");
			return;
		}
		const workspace = sorted.find((item) => item.workspace.id === selectedWorkspaceID);
		if (!workspace) {
			await showToast({ style: Toast.Style.Failure, title: "Select a Workspace" });
			return;
		}

		const toast = await showToast({ style: Toast.Style.Animated, title: "Opening link…" });
		try {
			const { data } = await openLink(workspace.workspace.name, link, executableSource);
			toast.style = Toast.Style.Success;
			toast.title = data.delivery === "launch" ? "Launched with Link" : "Sent Link";
			toast.message = `${data.workspaceName} · pid ${data.processID}`;
			await closeMainWindow({ popToRootType: PopToRootType.Immediate });
		} catch (error) {
			toast.style = Toast.Style.Failure;
			toast.title = "Could Not Open Link";
			toast.message = error instanceof Error ? error.message : String(error);
		}
	}

	return (
		<Form
			isLoading={isLoading || isReadingClipboard}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Open Link" icon={Icon.Link} onSubmit={submit} />
				</ActionPanel>
			}
		>
			<Form.TextField
				id="url"
				title="Link"
				placeholder="codex://…"
				value={url}
				error={urlError}
				onChange={(value) => {
					setURL(value);
					if (urlError) setURLError(undefined);
				}}
			/>
			{sorted.length > 0 && (
				<Form.Dropdown id="workspace" title="Workspace" value={selectedWorkspaceID ?? ""} onChange={setWorkspaceID}>
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
			)}
			<Form.Description text="The link goes only to this workspace's Codex. A running instance receives it directly; otherwise the workspace launches with it." />
		</Form>
	);
}
