import { useState } from 'react';
import {
	Action,
	ActionPanel,
	Color,
	Detail,
	getPreferenceValues,
	Icon,
	showToast,
	Toast,
	useNavigation
} from '@raycast/api';
import { type DecodeResult, type Flag, type Success, stripTrackingParams } from './decoder';
import { destinationDomain } from './domain';
import { wrapperLabels } from './wrapper-labels';

const flagStyles: Record<Flag, { source: Icon; tintColor: Color }> = {
	'plain-http': { source: Icon.LockUnlocked, tintColor: Color.Red },
	'ip-literal': { source: Icon.Desktop, tintColor: Color.Red },
	userinfo: { source: Icon.Person, tintColor: Color.Red },
	punycode: { source: Icon.Globe, tintColor: Color.Red },
	shortener: { source: Icon.Link, tintColor: Color.Yellow },
	'nonstandard-port': { source: Icon.Gear, tintColor: Color.Yellow },
	'tracking-params': { source: Icon.Eye, tintColor: Color.Yellow }
};

// Keep pasted content inside code fences, so Detail never creates remote images
// or active links from attacker-controlled Markdown embedded in a URL.
function block(value: string): string {
	const runs = value.match(/`+/g) ?? [];
	const fence = '`'.repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
	return `${fence}\n${value}\n${fence}`;
}
function chainMarkdown(result: Success): string {
	return result.chain.map((step, i) => `### Step ${i + 1}\n\n${block(step)}`).join('\n\n');
}
function copyMarkdown(url: string): string {
	const label = destinationDomain(url).replace(/[\\[\]]/g, '\\$&');
	const target = url.replace(/[<>\s\\]/g, (char) => encodeURIComponent(char));
	return `[${label}](<${target}>)`;
}

export function ResultView({
	result: initial,
	refresh
}: {
	result: Success;
	refresh: () => DecodeResult | Promise<DecodeResult>;
}) {
	const [result, setResult] = useState(initial);
	const [loading, setLoading] = useState(false);
	const { push } = useNavigation();
	const preferences = getPreferenceValues<Preferences>();
	const copiedUrl = preferences.stripTrackingParams
		? stripTrackingParams(result.decoded)
		: result.decoded;
	const domain = destinationDomain(result.decoded);
	const markdown = `${block(result.decoded)}\n\n**Wrapper:** ${wrapperLabels[result.wrapper].label}\n\n**Destination domain:**\n\n${block(domain)}\n\n**Flags:** ${result.flags.length ? result.flags.join(', ') : 'No listed flags (not a reputation check)'}\n\n${chainMarkdown(result)}\n\n${result.notes.join('\n\n')}\n\nDecoding is local; the URL is never fetched.`;
	async function reload() {
		setLoading(true);
		try {
			const next = await refresh();
			if (next.ok) setResult(next);
			else
				await showToast({
					style: Toast.Style.Failure,
					title:
						next.error === 'empty-input' ? 'Clipboard is empty.' : 'No link found in that text.'
				});
		} catch {
			await showToast({ style: Toast.Style.Failure, title: 'Could not read the link. Try again.' });
		} finally {
			setLoading(false);
		}
	}
	return (
		<Detail
			isLoading={loading}
			markdown={markdown}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label title="Destination" text={domain} icon={Icon.Globe} />
					<Detail.Metadata.Label
						title="Wrapper"
						text={wrapperLabels[result.wrapper].label}
						icon={Icon.Link}
					/>
					<Detail.Metadata.TagList title="Risk flags">
						{result.flags.map((flag) => (
							<Detail.Metadata.TagList.Item
								key={flag}
								text={flag}
								color={flagStyles[flag].tintColor}
								icon={flagStyles[flag]}
							/>
						))}
					</Detail.Metadata.TagList>
				</Detail.Metadata>
			}
			actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy Real Link" content={copiedUrl} />
					<Action.CopyToClipboard title="Copy as Markdown" content={copyMarkdown(copiedUrl)} />
					<Action.Paste title="Paste Real Link" content={copiedUrl} />
					<Action.OpenInBrowser title="Open in Browser" url={result.decoded} />
					<Action
						title="Show Decode Chain"
						icon={Icon.List}
						onAction={() =>
							push(<Detail navigationTitle="Decode Chain" markdown={chainMarkdown(result)} />)
						}
					/>
					<Action
						title="Refresh"
						icon={Icon.ArrowClockwise}
						onAction={reload}
						shortcut={{ modifiers: ['cmd'], key: 'r' }}
					/>
				</ActionPanel>
			}
		/>
	);
}
