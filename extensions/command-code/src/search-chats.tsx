import {Icon, List} from '@raycast/api';
import {usePromise} from '@raycast/utils';
import type {ReactElement} from 'react';
import {type Chat, loadChats, openLink} from './lib/data';
import {ignoreLoadError, LoadError} from './lib/load-error';
import {MISSING_TAG, OpenActions} from './lib/open-actions';

function ChatItem({chat}: {readonly chat: Chat}): ReactElement {
	const when = new Date(chat.lastActivityAt);
	return (
		<List.Item
			title={chat.title}
			subtitle={chat.projectName}
			icon={
				chat.unread
					? {value: Icon.CircleFilled, tooltip: 'Unread'}
					: Icon.Message
			}
			keywords={[chat.projectName, chat.branch]}
			accessories={[
				...(chat.folderMissing ? [MISSING_TAG] : []),
				...(chat.branch ? [{tag: chat.branch}] : []),
				...(chat.lastActivityAt
					? [{date: when, tooltip: when.toLocaleString()}]
					: []),
			]}
			actions={
				<OpenActions
					path={chat.projectPath}
					target={openLink(chat.projectPath, chat.id)}
					folderMissing={chat.folderMissing}
				/>
			}
		/>
	);
}

export default function SearchChats(): ReactElement {
	const {data, isLoading, error} = usePromise(loadChats, [], {
		onError: ignoreLoadError,
	});
	if (error) return <LoadError />;
	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search chats">
			{data?.length === 0 && (
				<List.EmptyView
					title="No chats yet"
					description="Chats you start in Command Code appear here."
				/>
			)}
			{data?.map(chat => (
				<ChatItem key={chat.id} chat={chat} />
			))}
		</List>
	);
}
