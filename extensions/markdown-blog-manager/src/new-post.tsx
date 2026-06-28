import path from 'path';
import { useEffect } from 'react';
import { Form, ActionPanel, Action, popToRoot, showToast, Toast, open } from '@raycast/api';
import { subdirectories, getPosts, createDraft, Post } from './utils/blog';
import { titleToSlug } from './utils/utils';
import { fillTemplateVariables } from './utils/templates';
import { FormValidation, useForm } from '@raycast/utils';
import { ValidatePreferences } from './utils/preferences';

export default function Command() {
	return (
		<ValidatePreferences>
			<NewPost />
		</ValidatePreferences>
	);
}

export function NewPost() {
	const posts = getPosts();

	const { handleSubmit, itemProps, setValue } = useForm<Post>({
		onSubmit: async (post: Post) => {
			const draft = createDraft(post);

			await showToast({
				style: Toast.Style.Success,
				title: 'Success',
				message: `Created ${post.title}`,
			});

			await open(draft);
			popToRoot();
		},
		validation: {
			title: FormValidation.Required,
			content: FormValidation.Required,
			slug: (slug) => {
				if (!slug) {
					return 'Slug is required';
				}

				const existingPost = posts.find((post) => post.name.replace(/\.mdx?/, '') === slug);
				if (existingPost) {
					showToast({
						style: Toast.Style.Failure,
						title: 'Post already exists',
						message: `${path.basename(path.dirname(existingPost.path))}/${existingPost.name}`,
					});

					return 'Post already exists';
				}
			},
		},
		initialValues: {
			summary: 'A new draft has been created.',
			extension: 'md',
		},
	});

	useEffect(() => {
		const subdirectory = itemProps.subdirectory.value || '';
		const title = itemProps.title.value || '';
		const summary = itemProps.summary.value || '';
		setValue('content', fillTemplateVariables(subdirectory, title, summary));
	}, [itemProps.subdirectory.value, itemProps.title.value, itemProps.summary.value]);

	useEffect(() => {
		if (!itemProps.title.value) {
			return;
		}
		setValue('slug', titleToSlug(itemProps.title.value));
	}, [itemProps.title.value]);

	return (
		<Form
			enableDrafts
			navigationTitle={`Creating ${itemProps.slug.value}.${itemProps.extension.value}`}
			actions={
				<ActionPanel>
					<Action.SubmitForm onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextField title="Title" placeholder="Post Title" {...itemProps.title} />
			<Form.TextField title="Summary" {...itemProps.summary} />
			<Form.Dropdown title="Subdirectory" {...itemProps.subdirectory}>
				<Form.Dropdown.Item value="" title="None" />
				{subdirectories().map((subdirectory) => (
					<Form.Dropdown.Item key={subdirectory} value={subdirectory} title={subdirectory} />
				))}
			</Form.Dropdown>
			<Form.TextField title="Post Slug" {...itemProps.slug} />
			<Form.Dropdown title="File Extension" {...itemProps.extension}>
				<Form.Dropdown.Item value="md" title=".md" />
				<Form.Dropdown.Item value="mdx" title=".mdx" />
			</Form.Dropdown>
			<Form.Separator />
			<Form.Description text="A new markdown file will be created in your drafts folder. with the following content:" />
			<Form.TextArea title="Preview" enableMarkdown={true} {...itemProps.content} />
		</Form>
	);
}
