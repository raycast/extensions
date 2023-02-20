# Markdown Blog Manager

Create, browse and edit Markdown Blog posts from Raycast.

## Setup

This extension helps organize, edit and publish blog posts from Raycast. To do achieve this, it makes a couple assumptions about the structure of your blog.

1. Posts are stored in a folder on your computer.
2. Posts are written in `md` or `mdx` files.
3. Drafts and published posts are stored in separate folders.
4. Posts can be categorized using sub-directories.

## Folder Structure
You can keep your posts anywhere on your computer and configure the posts and drafts directories separately.

This is the folder structure I use with Astro:

```
/pyronaur.com
	/src
		/content
			/public
				- post1.md
				- post2.md
				/subdirectory-name
					- post3.md
					- post4.md
			/draft
				- post5.md
				- post6.md
				/another-subdirectory
					- post7.md
					- post8.md
```

When a post is published, it's moved from the drafts folder to the public folder. For example, `post7.md` would be moved from `/drafts/another-subdirectory` to `/public/another-subdirectory`.

The slugs of each post must be unique even though they may be in different directories.

## Variables and Templates

By default, this extension uses the Frontmatter format for markdown files. If you don't want to use Frontmatter or you just want to tweak the template, you can do so.

Create a `.template.md` file in the `drafts` directory or any sub-directories. This template will be used when creating a new post.

The default template is:

```frontmatter
---
title: __title__ 
summary: __summary__
date: __date__
---

Once upon a time...
```

The `__title__` and `__summary__` variables will be replaced with the values you enter when creating a new post. And `__date__` will be replaced with the current date formatted as `YYYY-MM-DD`.

When a post is published, the `date` Frontmatter variable is going to be updated again with the current publishing date.

> Note: This feature currently isn't going to work if you don't use Frontmatter or have the `date` variable customized to something else. Let me know if this is something that you'd like to see. I'm happy to add it, if that's something that you'd find useful.

## Ignore

You might want to ignore some files inside the blog directories.

In the root of each of you content directories (`draft` and `public` paths), you can add a file called `.ray-ignore` and specify glob patterns to ignore for that directory:

```
archive/*
special-hidden-post.md
```


Props @thomaspaulmann - The starting point of this project was inspired by [Downloads Manager](https://github.com/raycast/extensions/tree/main/extensions/downloads-manager) extension.
