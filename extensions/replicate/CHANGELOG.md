# Replicate Changelog

## [Windows support] - 2026-09-29

- Runs on Raycast for Windows as well as macOS

## [Replicate models in Raycast AI] - 2026-09-27

- Replicate models can be picked in Raycast AI's model picker (requires Raycast Pro). Image models reply with the image, editing models change an attached image or the last one in the chat, and text models stream their answer. A status section shows progress while a model runs
- New Raycast AI Models screen in the Replicate menu: popular image, image-editing and text models are offered and refreshed daily. Search Replicate to add any other model, hide popular ones, and set per-model chat defaults such as an aspect ratio. Models you've chatted with stay until you remove them
- `@replicate` picks from your Raycast AI models, or always uses your Default Model if you set one, can edit an existing image, and shows each step while an image generates. Fast models finish in a single step
- Runs started from Raycast AI stop after five minutes, so a chat you leave doesn't keep billing
- Run a Model lists every Replicate model with search, collections and a detail pane, builds its form from each model's inputs (including file uploads), remembers your last inputs, and runs official models on their own endpoint
- View Predictions is a list with a preview pane and a colored status dot. Generated images are saved on your computer (Image History setting) so they still show after Replicate deletes them, and scrolling to the end no longer repeats the list
- `@replicate` asks before a run bills your Replicate account; turn this off with the AI Tool setting
- Searching your prompts in View Predictions works again
- Explore Models opens replicate.com/explore
- Copying an image no longer needs Finder automation permission
- The model form no longer waits forever on a prediction cancelled from replicate.com
- Errors show Replicate's own message instead of "Something went wrong"
- New icon matching Replicate's current logo
- Requires Raycast 2.5 or later

## [Updated Grid component and Replicate name] - 2022-11-05

- Updated Replicate name
- Updated to support the new columns api on the Grid component

## [Added Open In Browser action] - 2022-10-11

- Added an Open In Browser action to view on replicate.com

## [Added Replicate] - 2022-09-17

- Initial version code
