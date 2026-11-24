import { Action, ActionPanel, Alert, Color, Form, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { useState } from "react";
import { ExecutableInstallation, InstallDestination, installRelease, userExecutablePath } from "../lib/executable";
import { fallbackVersion, fetchReleases, FXCodexRelease, isFallbackRelease } from "../lib/releases";

export function InstallExecutableView({
	onChange,
	replacement,
}: {
	onChange: () => void;
	replacement?: ExecutableInstallation;
}) {
	const { data: releases, error, isLoading, revalidate } = usePromise(fetchReleases, []);
	const fallback = releases?.find(isFallbackRelease);
	const remaining = releases?.filter((release) => !isFallbackRelease(release)) ?? [];
	const latestStableVersion = releases?.find((release) => !release.isPrerelease)?.version;

	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search fxCodex releases…">
			{fallback && (
				<List.Section title="Tested Fallback">
					<ReleaseItem
						release={fallback}
						latestStableVersion={latestStableVersion}
						replacement={replacement}
						onChange={onChange}
					/>
				</List.Section>
			)}
			<List.Section title="GitHub Releases">
				{remaining.map((release) => (
					<ReleaseItem
						key={release.version}
						release={release}
						latestStableVersion={latestStableVersion}
						replacement={replacement}
						onChange={onChange}
					/>
				))}
			</List.Section>
			{!isLoading && (!releases || releases.length === 0) && (
				<List.EmptyView
					title="Releases Unavailable"
					description={
						error
							? `${error.message} The extension's tested fallback is ${fallbackVersion}.`
							: "No compatible universal release assets were found."
					}
					actions={
						<ActionPanel>
							<Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
							<Action.OpenInBrowser
								title={`Open FxCodex ${fallbackVersion} Release`}
								url={`https://github.com/CaptureContext/fxcodex/releases/tag/${fallbackVersion}`}
							/>
						</ActionPanel>
					}
				/>
			)}
		</List>
	);
}

function ReleaseItem({
	release,
	latestStableVersion,
	replacement,
	onChange,
}: {
	release: FXCodexRelease;
	latestStableVersion?: string;
	replacement?: ExecutableInstallation;
	onChange: () => void;
}) {
	const published = release.publishedAt ? new Date(release.publishedAt).toLocaleDateString() : undefined;
	return (
		<List.Item
			title={release.version}
			subtitle={[release.isPrerelease ? "Prerelease" : "Stable", published].filter(Boolean).join(" · ")}
			icon={Icon.Download}
			accessories={isFallbackRelease(release) ? [{ tag: { value: "Tested", color: Color.Green } }] : []}
			actions={
				<ActionPanel>
					<Action.Push
						title={replacement ? `Install ${release.version} at Current Location…` : `Install ${release.version}…`}
						icon={Icon.Download}
						target={
							<InstallDestinationForm
								release={release}
								isLatestStable={release.version === latestStableVersion}
								replacement={replacement}
								onChange={onChange}
							/>
						}
					/>
					<Action.OpenInBrowser title="Open Release on GitHub" url={release.url} />
				</ActionPanel>
			}
		/>
	);
}

function InstallDestinationForm({
	release,
	isLatestStable,
	replacement,
	onChange,
}: {
	release: FXCodexRelease;
	isLatestStable: boolean;
	replacement?: ExecutableInstallation;
	onChange: () => void;
}) {
	const [destination, setDestination] = useState(replacement ? "replace" : "extension");
	const pathCanBeAdded = destination === "user" || destination === "custom";

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title={`Install FxCodex ${release.version}`}
						icon={Icon.Download}
						onSubmit={async (values: { destination: string; customDirectory?: string[]; addToPath?: boolean }) => {
							const target = installDestination(values.destination, values.customDirectory, replacement);
							const replacingPath = targetPath(target);
							if (replacingPath && (await pathExists(replacingPath))) {
								const confirmed = await confirmAlert({
									title: `Replace Existing fxCodex with ${release.version}?`,
									message: replacingPath,
									primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
								});
								if (!confirmed) return;
							}

							const toast = await showToast({
								style: Toast.Style.Animated,
								title: `Installing fxCodex ${release.version}…`,
							});
							try {
								const path = await installRelease(release, target, values.addToPath === true);
								toast.style = Toast.Style.Success;
								toast.title = `fxCodex ${release.version} Installed`;
								toast.message = path;
								onChange();
							} catch (error) {
								toast.style = Toast.Style.Failure;
								toast.title = "Installation Failed";
								toast.message = error instanceof Error ? error.message : String(error);
								throw error;
							}
						}}
					/>
					<Action.OpenInBrowser title="Open Release on GitHub" url={release.url} />
				</ActionPanel>
			}
		>
			<Form.Description
				title={`fxCodex ${release.version}`}
				text={
					isFallbackRelease(release)
						? "This is the fallback version tested with the current extension release. Its executable and SHA-256 checksum will be downloaded from GitHub and verified."
						: "The executable and SHA-256 checksum will be downloaded from the selected GitHub release and verified before installation."
				}
			/>
			<Form.Dropdown id="destination" title="Install To" value={destination} onChange={setDestination}>
				{replacement && <Form.Dropdown.Item value="replace" title={`Replace ${replacement.path}`} />}
				<Form.Dropdown.Item value="extension" title="Extension Support (Versioned)" />
				<Form.Dropdown.Item value="user" title="Current User (~/.local/bin)" />
				<Form.Dropdown.Item value="custom" title="Custom Directory" />
				{isLatestStable && <Form.Dropdown.Item value="homebrew" title="Homebrew (Latest Stable)" />}
			</Form.Dropdown>
			{destination === "custom" && (
				<Form.FilePicker
					id="customDirectory"
					title="Directory"
					allowMultipleSelection={false}
					canChooseDirectories
					canChooseFiles={false}
				/>
			)}
			{pathCanBeAdded && (
				<Form.Checkbox id="addToPath" label="Add this directory to PATH for future shell sessions" defaultValue />
			)}
			{destination === "extension" && (
				<Form.Description text="Each version gets its own extension-support directory, so several versions can remain installed side by side." />
			)}
			{destination === "homebrew" && (
				<Form.Description text="Runs brew install capturecontext/tap/fxcodex. Homebrew controls the installed version and future upgrades." />
			)}
		</Form>
	);
}

function installDestination(
	destination: string,
	customDirectory: string[] | undefined,
	replacement: ExecutableInstallation | undefined,
): InstallDestination {
	switch (destination) {
		case "replace":
			if (!replacement) throw new Error("There is no executable to replace.");
			return { kind: "replace", path: replacement.path, destination: replacement.destination };
		case "user":
			return { kind: "user" };
		case "custom": {
			const directory = customDirectory?.[0];
			if (!directory) throw new Error("Choose a custom installation directory.");
			return { kind: "custom", directory };
		}
		case "homebrew":
			return { kind: "homebrew" };
		case "extension":
			return { kind: "extension" };
		default:
			throw new Error("Choose an installation destination.");
	}
}

function targetPath(destination: InstallDestination): string | undefined {
	switch (destination.kind) {
		case "user":
			return userExecutablePath();
		case "custom":
			return join(destination.directory, "fxcodex");
		case "replace":
			return destination.path;
		case "extension":
		case "homebrew":
			return undefined;
	}
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
