# Notion Research Assistant Raycast Extension

This extension is supercharges your research! It allows you to paste Arxiv paper urls and automatically add them to a Notion database.
If given an OpenAI key, the extension will generate explanations to jargon and concepts from the papers.
Additionally, references from the paper are added and sorted by number of citations.
All authors are added to enable full-text search on authors inside your Notion database.

## Setup
### Create a Notion internal integration:
Initially, you will need to create an internal notion integration and use the resulting Notion api key (Public OAuth support will be added soon.)
https://developers.notion.com/docs/authorization

Then, turn on the extension in the page or space where you want to use the extension.
<img width="1792" alt="image" src="https://github.com/razgaon/raycast-notion-research/assets/43913869/86dfeb46-4a3b-4285-a001-7098ba3dacd8">


### Create a database under a page you prefer using the "Create Research Database" command.
https://github.com/razgaon/raycast-notion-research/assets/43913869/f66f7275-eb22-43f7-8270-c7d982cf59d1


Copy the key and add it to the extension preferences.

### Add Papers!
To add a paper, simply copy an Arxiv link (or many!) and paste them into the "Add Research Paper" command. Once the papers load, just press enter and you're done!

https://github.com/razgaon/raycast-notion-research/assets/43913869/03d514c0-999e-4844-b4dc-d49403c7a74c

# Extras
If you want to generate explanations for concepts from papers, you can add your OpenAI key and it will happen automatically (less than 1 cent per paper)

If you use Readwise Reader, you can add your api key and the extension will automatically add the paper to Reader.
