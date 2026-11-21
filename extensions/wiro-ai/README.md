# Wiro AI

Generate images, video, speech and music, edit images, transcribe audio, chat with LLMs, run workflows and agents, and search 1,000+ AI models on [Wiro AI](https://wiro.ai) from Raycast.

Each command lists the models of its category straight from the Wiro AI catalog, builds its form from the chosen model's own inputs and shows the price for your settings before you run it. New models show up without an update to the extension.

## Commands

- **Generate Image**: pick a text-to-image model, write a prompt and set the model's options, such as resolution, ratio or quality.
- **Edit Image**: starts from the image selected in Finder or an image file on the clipboard. Edit it with a prompt, upscale it, remove its background or restore an old photo.
- **Generate Video**: make a video from a prompt or from an image, follow the task while the model works and cancel it if you need to.
- **Generate Speech**: reads the selected text aloud with the text-to-speech model and the voice you pick.
- **Generate Music**: make music or a song from a prompt.
- **Transcribe Audio**: turns an audio file into text you can copy, paste or save.
- **Ask AI**: chat with LLMs from OpenAI, Anthropic, Google, DeepSeek, xAI, Qwen and others through the Wiro AI LLM gateway, with a model picker and follow-up questions. Type a question after the command name to start a new conversation right away.
- **Search Models**: search the catalog by name, owner or task and filter it by category. Each model shows its cover, description, typical run time and starting price, and opens in the form that fits it.
- **Run Any Model**: search the whole catalog and run any model with a form built from its inputs.
- **Run Workflow**: run one of your Wiro AI workflows with its inputs and get every output it returns.
- **Message Agent**: message one of the agents deployed in your workspace and read its replies.
- **Task History**: your recent tasks with their status, prompt, run time and cost. Open any of them to get its results again.
- **Wallet Balance**: your balance in the menu bar, with links to add funds, your task history and the dashboard.

## Results

Every output comes back as a row with a preview. Copy it, save it to Downloads, show it in Finder, preview it with Quick Look, or open it. Text results, such as transcripts, can be copied, pasted into the frontmost app or saved as a file.

## Setup

1. Sign up at [wiro.ai](https://wiro.ai) and create a project at [wiro.ai/panel/project/new](https://wiro.ai/panel/project/new).
2. Open any Wiro AI command and paste the project's API key into **API Key**.
3. If you created the project with signature-based authentication, paste its API secret into **API Secret** as well. Leave it empty for an API Key Only project.

**Save Folder** sets where Save puts files. Your Downloads folder is used when it is empty.

## Pricing

Searching models is free. Model runs, workflow steps and chat messages are charged to your Wiro AI project's wallet at each model's price, and failed tasks are not charged. Messages to your own agents use the agent's credits.
