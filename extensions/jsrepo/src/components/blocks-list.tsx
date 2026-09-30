import {
	Action,
	ActionPanel,
	getPreferenceValues,
	Icon,
	Keyboard,
	List,
	showToast,
	useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
	selectProvider,
	fetchManifest,
	Manifest,
	fetchRaw,
	Block,
} from "jsrepo";
import { CREATE_ERROR_TOAST_OPTIONS } from "../constants";
import {
	getIconForBlock,
	getRegistryState,
	getToken,
	isTestFile,
} from "../utils/jsrepo";
import * as u from "../utils/url";
import { generateMarkdownContent } from "../utils/markdown";
import type { Preferences } from "../preferences";

type File = { name: string; code: string };

type Props = {
	registryUrl: string;
};

export default function BlocksList({ registryUrl }: Props) {
	const [isLoading, setIsLoading] = useState(true);
	const [manifest, setManifest] = useState<Manifest>();
	const [blockFileCode, setBlockFileCode] = useState<Map<string, File[]>>(
		new Map(),
	);

	const navigation = useNavigation();

	const preferences = getPreferenceValues<Preferences>();

	useEffect(() => {
		async function loadData() {
			try {
				const provider = selectProvider(registryUrl);

				// this really shouldn't happen and should be handled higher up
				if (!provider) {
					throw new Error("Invalid registry url!");
				}

				const token = getToken(preferences, provider);

				const state = await getRegistryState(
					registryUrl,
					provider,
					preferences,
				);

				const manifest = (await fetchManifest(state, { token })).match(
					(v) => v,
					() => {
						const suggestions =
							provider.name === "github" &&
							(token === undefined || token.trim().length === 0)
								? "You may have reached your request limit without providing a token to GitHub. Try providing a token in the extension configuration."
								: "";

						throw new Error(`fetching manifest. ${suggestions}`);
					},
				);

				setManifest(manifest);

				Promise.all(
					manifest.categories
						.flatMap((c) => c.blocks)
						.map(async (block) => {
							if (!block.list) return;

							const files = await Promise.all(
								block.files
									.filter((f) => !isTestFile(f))
									.map(async (file) => {
										const code = await fetchRaw(
											state,
											u.join(block.directory, file),
											{ token },
										);

										return {
											name: file,
											code: code.unwrapOr(""),
										};
									}),
							);

							const key = `${block.category}/${block.name}`;

							setBlockFileCode((v) => {
								const newMap = new Map(v);

								newMap.set(key, files);

								return newMap;
							});
						}),
				);
			} catch (err) {
				// just go back nothing to see here
				navigation.pop();
				showToast(CREATE_ERROR_TOAST_OPTIONS(err));
			} finally {
				setIsLoading(false);
			}
		}

		loadData();
	}, []);

	return (
		<List
			isLoading={isLoading}
			isShowingDetail
			navigationTitle={`${registryUrl}`}
		>
			{manifest !== undefined && (
				<>
					{manifest.categories
						.flatMap((c) => c.blocks)
						.filter((b) => b.list)
						.map((block) => {
							const specifier = `${block.category}/${block.name}`;
							const files = blockFileCode?.get(specifier) ?? [];

							return (
								<BlockListItem
									key={specifier}
									block={block}
									files={files}
									registryUrl={registryUrl}
									maximumPreviewLOC={
										preferences.limitPreviewLOC
											? parseInt(
													preferences.maximumPreviewLOC,
												)
											: undefined
									}
								/>
							);
						})}
				</>
			)}
		</List>
	);
}

export function BlockListItem({
	block,
	registryUrl,
	files,
	maximumPreviewLOC,
}: {
	block: Block;
	registryUrl: string;
	files: File[];
	maximumPreviewLOC: number | undefined;
}) {
	const specifier = `${block.category}/${block.name}`;
	const markdown = useMemo(
		() =>
			generateMarkdownContent(
				registryUrl,
				block,
				files,
				maximumPreviewLOC,
			),
		[registryUrl, block, files, maximumPreviewLOC],
	);

	return (
		<List.Item
			title={specifier}
			icon={getIconForBlock(block)}
			detail={<List.Item.Detail markdown={markdown} />}
			actions={
				<ActionPanel>
					<ActionPanel.Section>
						<Action.CopyToClipboard
							icon={Icon.Terminal}
							title="Copy Command"
							content={`jsrepo@latest add ${u.join(registryUrl, specifier)}`}
						/>
					</ActionPanel.Section>
					<ActionPanel.Section>
						{files.length === 1 ? (
							<Action.CopyToClipboard
								icon={Icon.Code}
								title="Copy Code"
								content={files[0].code}
								shortcut={{ key: "0", modifiers: ["cmd"] }}
							/>
						) : (
							files.map((file, i) => (
								<Action.CopyToClipboard
									key={file.name}
									icon={Icon.Code}
									title={`Copy Code for ${file.name}`}
									content={file.code}
									shortcut={
										i <= 9
											? ({
													key: i.toString() as Keyboard.Shortcut["key"],
													modifiers: ["cmd"],
												} satisfies Keyboard.Shortcut)
											: undefined
									}
								/>
							))
						)}
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}
