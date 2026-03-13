# Notion Research Assistant Raycast Extension

Enhance your research and learning journey with this powerful Raycast extension for Notion. This extension offers two primary features: **Adding a Concept** and **Adding a Paper** to your Notion workspace.

## Table of Contents

1. [Adding a Concept](#adding-a-concept)
2. [Adding a Paper](#adding-a-paper)
3. [Setup Instructions](#setup-instructions)
   - [Notion Integration](#create-a-notion-internal-integration)
   - [Extension Activation](#activate-the-extension)
4. [Paper-Specific Setup](#paper-specific-setup)
5. [Concept-Specific Setup](#concept-specific-setup)
6. [Additional Features](#additional-features)

---

## Adding a Concept

Are your ChatGPT interactions getting lost in endless threads? The `Adding a Concept` feature lets you effortlessly transfer responses from ChatGPT to a designated Notion database. Simply choose a name for the concept, and let the extension handle the rest.

---

## Adding a Paper

Effortlessly organize your research papers from **Arxiv** into your Notion database using the `Adding a Paper` command. This feature:

- Automatically imports the paper details.
- Sorts references by citation count.
- Generates explanations for jargon and complex concepts if provided with an OpenAI key.
- Enables full-text search for authors within your Notion workspace.

> [arXiv](https://arxiv.org/) is a free distribution service and open-access archive for scholarly articles.

---

## Setup Instructions

### Create a Notion Internal Integration

1. Initially, you'll need to set up an internal Notion integration. Follow the guidelines [here](https://developers.notion.com/docs/authorization) to obtain your Notion API key. (Public OAuth support coming soon.)

### Activate the Extension

2. After creating the integration, activate the extension in the desired Notion page or workspace.

![Extension Activation](https://github.com/razgaon/raycast-notion-research/assets/43913869/86dfeb46-4a3b-4285-a001-7098ba3dacd8)

---

## Paper-Specific Setup

1. **Create a Research Database**: Use the "Create Research Database" command to set up a database under your preferred Notion page. (Note: The page must have a non-empty title.)

   ![Database Creation](https://github.com/razgaon/raycast-notion-research/assets/43913869/f66f7275-eb22-43f7-8270-c7d982cf59d1)

2. **Add Papers**: To add research papers, copy one or multiple Arxiv URLs and paste them into the "Add Research Paper" command. Once loaded, press enter to complete the action.

   ![Add Papers](https://github.com/razgaon/raycast-notion-research/assets/43913869/03d514c0-999e-4844-b4dc-d49403c7a74c)

---

## Concept-Specific Setup

Create a Notion database with a column named "Title". Locate the database key in the URL and add it to the extension preferences. For example, the database key in the following URL `https://www.notion.so/testuser/c0320379be2440ce8bc48b1889663122?v=b1aa958d689342a5a857a7d46d4835aa` is `c0320379be2440ce8bc48b1889663122`.

---

## Additional Features

- **OpenAI Integration**: To generate explanations for terms and concepts in papers, add your OpenAI API key. (Cost: Less than $0.01 per paper.)
- **Readwise Reader Integration**: If you use [Readwise Reader](https://readwise.io/read), provide your API key and the extension will automatically add papers to your Readwise Reader.
