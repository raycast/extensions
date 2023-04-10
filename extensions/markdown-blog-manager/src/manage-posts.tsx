import { ActionPanel, Action, List, useNavigation, Icon, Color } from '@raycast/api';
import { useState, useEffect } from 'react';
import { type MarkdownFile, getOrganizedPosts, publishPost } from './utils/blog';
import NewPost from './new-post';
import { capitalize, clearFileCache } from './utils/utils';
import { ValidatePreferences } from './utils/preferences';

const filters = {
	all: () => true,
	published: (file: MarkdownFile) => !file.draft,
	drafts: (file: MarkdownFile) => file.draft,
};

type AvailableFilters = keyof typeof filters;

function getFilteredPosts(filterName: AvailableFilters) {
	const posts = getOrganizedPosts();
	for (const [key, group] of Object.entries(posts)) {
		posts[key] = group.filter(filters[filterName]);
	}

	return posts;
}

export default function Command() {
	return (
		<ValidatePreferences>
			<ManagePosts />
		</ValidatePreferences>
	);
}

function ManagePosts() {
	const [filter, setFilter] = useState<AvailableFilters>('all');
	const [files, setFiles] = useState<Record<string, MarkdownFile[]>>(getFilteredPosts(filter));

	function refreshFiles() {
		clearFileCache();
		setFiles(getOrganizedPosts());
	}

	function changeActiveFilter(value: string) {
		if (value in filters) {
			setFilter(value as AvailableFilters);
			return;
		}
		throw new Error(`Invalid filter: ${value}`);
	}

	useEffect(() => {
		setFiles(getFilteredPosts(filter));
	}, [filter]);

	const subdirectories = Object.keys(files);
	return (
		<List
			navigationTitle="Browse Posts"
			searchBarAccessory={
				<List.Dropdown tooltip="Select Post Status" storeValue={true} onChange={changeActiveFilter}>
					<List.Dropdown.Item key="all" title="All" value="all" />
					<List.Dropdown.Item key="published" title="Published" value="published" />
					<List.Dropdown.Item key="draft" title="Drafts" value="drafts" />
				</List.Dropdown>
			}
		>
			{subdirectories.length === 0 && (
				<List.EmptyView title="Couldn't find any .md or .mdx files!" description="" />
			)}

			{subdirectories.length !== 0 &&
				subdirectories.map((subdirectory) => (
					<List.Section title={capitalize(subdirectory)} key={subdirectory}>
						{subdirectory in files &&
							files[subdirectory].map((file) => (
								<Post file={file} key={file.path} refreshFiles={refreshFiles} />
							))}
					</List.Section>
				))}
		</List>
	);
}

function Post({ file, refreshFiles }: { file: MarkdownFile; refreshFiles: () => void }) {
	const { push } = useNavigation();
	const createNewPost = () => push(<NewPost />);

	function publish() {
		publishPost(file);
		refreshFiles();
	}

	return (
		<List.Item
			keywords={file.keywords}
			title={file.title}
			subtitle={file.name}
			icon={
				file.draft
					? { source: Icon.CircleProgress75, tintColor: Color.SecondaryText }
					: { source: Icon.CircleProgress100, tintColor: Color.Green }
			}
			accessories={[
				{
					date: file.lastModifiedAt,
					tooltip: `Last modified: ${file.lastModifiedAt.toLocaleString()}`,
				},
			]}
			actions={
				<ActionPanel>
					<ActionPanel.Section>
						<Action.Open title="Open File" target={file.path} />
						<Action.ShowInFinder path={file.path} />
						<Action
							icon={Icon.NewDocument}
							title="Create a new blog post"
							shortcut={{ modifiers: ['cmd'], key: 'n' }}
							onAction={createNewPost}
						/>
						<Action.OpenWith path={file.path} shortcut={{ modifiers: ['cmd'], key: 'o' }} />
						{file.draft && (
							<Action
								icon={{ source: Icon.PlusCircleFilled, tintColor: Color.Green }}
								title={`Publish "${file.name}"`}
								shortcut={{ modifiers: ['cmd'], key: 's' }}
								onAction={publish}
							/>
						)}
					</ActionPanel.Section>
					<ActionPanel.Section>
						<Action.Trash
							title="Delete File"
							paths={file.path}
							shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
							onTrash={refreshFiles}
						/>
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}
