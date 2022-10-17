import path from 'path';
import fs from 'fs-extra';
import { useEffect, useState, useRef } from 'react';
import { Form, ActionPanel, Action, popToRoot, showToast, Toast, open } from '@raycast/api';
import { categories, getPosts } from './utils/blog';
import preferences from './utils/preferences';
import { titleToSlug } from './utils/utils';
import { fillTemplateVariables } from './utils/templates';

interface Post {
	title: string;
	summary: string;
	category: string;
	date: string;
	content: string;
}

export default function Command() {
	const [title, setTitle] = useState('');
	const [summary, setSummary] = useState('');
	const [category, setCategory] = useState('');
	const [preview, setPreview] = useState('');
	const [extension, setExtension] = useState('.md');
	const [slug, setSlug] = useState('');
	const previewRef = useRef<Form.TextArea>(null);
	const slugRef = useRef<Form.TextField>(null);
	const posts = getPosts();

	const [slugError, setSlugError] = useState<string | undefined>();

	useEffect(() => {
		setPreview(fillTemplateVariables(category, title, summary));
	}, [category, title, summary]);

	useEffect(() => {
		previewRef.current?.reset();
	}, [preview]);

	useEffect(() => {
		setSlug(titleToSlug(title));
	}, [title]);

	useEffect(() => {
		validatePostSlug();
		slugRef.current?.reset();
	}, [slug]);

	async function handleSubmit(values: Post): Promise<boolean> {
		if (!validatePostSlug()) {
			return false;
		}

		const content = values.content;
		let category = '';

		if (values.category) {
			category = values.category + '/';
		}
		const postPath = path.join(preferences().draftsPath, category, `${slug}.${extension}`);
		fs.ensureDirSync(path.dirname(postPath));
		fs.writeFileSync(postPath, content);

		await showToast({
			style: Toast.Style.Success,
			title: 'Success',
			message: `Created ${path}`,
		});

		await open(postPath);
		popToRoot();

		return true;
	}

	function validatePostSlug() {
		if (!slug) {
			setSlugError('Slug is required');
			return false;
		}

		const existingPost = posts.find((post) => post.name.replace(/\.mdx?/, '') === slug);
		if (existingPost) {
			showToast({
				style: Toast.Style.Failure,
				title: 'Post already exists',
				message: `${path.basename(path.dirname(existingPost.path))}/${existingPost.name}`,
			});

			setSlugError('Post Already Exists!');
			return false;
		}

		setSlugError(undefined);
		return true;
	}

	return (
		<Form
			enableDrafts
			navigationTitle={`Creating ${slug}.${extension}`}
			actions={
				<ActionPanel>
					<Action.SubmitForm onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextField id="title" title="Title" defaultValue="Post Title" onChange={setTitle} />
			<Form.TextField
				id="summary"
				title="Summary"
				defaultValue="A new draft has been created."
				onChange={setSummary}
			/>
			<Form.Dropdown id="category" title="Category" defaultValue="" onChange={setCategory}>
				<Form.Dropdown.Item value="" title="None" />
				{categories().map((category) => (
					<Form.Dropdown.Item key={category} value={category} title={category} />
				))}
			</Form.Dropdown>
			<Form.TextField
				id="slug"
				title="Post Slug"
				defaultValue={slug}
				onChange={setSlug}
				error={slugError}
				ref={slugRef}
			/>
			<Form.Dropdown id="extension" title="File Extension" defaultValue="" onChange={setExtension}>
				<Form.Dropdown.Item value="md" title=".md" />
				<Form.Dropdown.Item value="mdx" title=".mdx" />
			</Form.Dropdown>
			<Form.Separator />
			<Form.Description text="A new markdown file will be created in your drafts folder. with the following content:" />
			<Form.TextArea
				id="content"
				title="Preview"
				enableMarkdown={true}
				defaultValue={preview}
				ref={previewRef}
			/>
		</Form>
	);
}
