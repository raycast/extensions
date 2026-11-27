# HF Media Studio

A native Raycast extension for exploring public Hugging Face Gradio Spaces, generating media, and saving output locally.

## Setup

Install Node.js and Raycast, then run `npm ci`, `npm test`, `npm run typecheck`, and `npm run dev`. Configure a dedicated least-privilege Hugging Face access token in Raycast preferences. The optional Billing read permission enables live ZeroGPU quota reporting. Never use a write/admin token. Requests send the token and selected inputs to the relevant public Space; only submit non-confidential media. Check each model's license and service terms.

## Commands

- HF Generate Image — Z-Image Turbo / FLUX Schnell
- HF Generate Speech — Kokoro CPU (subject to availability)
- HF Generate Music or Sound Effects — Stable Audio 3
- HF Remove Background — BiRefNet
- HF AI Toolbox — browse 21 task categories and 27 model entries, inspect named Gradio endpoints and configure inputs dynamically.
- HF Media History — browse local generated files.

The Toolbox includes image editing, upscaling, camera angles, outpainting, speech/voice cloning, transcription, voice isolation, music/SFX, video, avatars, animation, video upscaling, 3D, OCR, captioning, depth and segmentation. Availability, API schemas, input compatibility and free quotas vary; not every listed Space has been successfully tested. Use only authorized voices and images. The extension does not guarantee free execution, and Hugging Face paid overquota settings may apply. Check quota and billing before running jobs. No automatic quota-based account rotation.

Outputs default to Downloads/HF Media Studio. Results show the available quota after generation. Text, image, audio, video and supported 3D/depth files can be saved; complex upstream widgets may require the original Space.

## Screenshots

See the screenshots in the extension Store metadata.

## Branches

`main`: single primary token, intended for Store review.
`dev`: optional additional authorized token profiles, selected manually, and guest mode.

## Status

Local TypeScript, automated tests and distribution build are checked before submission. Individual Space integrations still require live validation. This is an independent project, not an official Hugging Face or Raycast product.

MIT licensed.
