# Setting up GLM Models

This extension adds Z.ai / BigModel GLM models to Raycast's AI Chat, Quick AI and AI Commands.

## 1. Create an API key

Pick **one** platform — they are separate services with separate keys:

- **Z.ai** (international, [z.ai](https://z.ai)): open **API Keys**, create a pay-as-you-go key
- **BigModel** (China, [open.bigmodel.cn](https://open.bigmodel.cn)): open **API Keys**, create a pay-as-you-go key

## 2. Fill in the form

- **API Key** — paste the key you just created
- **Platform** — pick **Z.ai (pay-as-you-go)** or **BigModel (pay-as-you-go)** to match

> ⚠️ A key from one platform will not work on the other — requests fail with `401`. If that happens, run the extension's **Check Setup** command to diagnose.

> 💡 **GLM Coding Plan or Team Plan subscriber?** Coding Plan and Team Plan keys use different endpoints than pay-as-you-go keys — pick **Z.ai GLM Coding Plan** or **BigModel GLM Coding Plan** to match your subscription. Team Plan members get their key under **Team Coding Plan → My Plan**; it works on the same endpoint as individual Coding Plans. Note that Z.ai describes GLM Coding Plan usage as intended for officially supported coding tools.

## 3. Enable the models in Raycast

1. You need a **Raycast Pro** subscription (Raycast's requirement for extension-provided AI models)
2. Open **Raycast Settings → AI** and allow models from this extension (or opt in via the model picker)
3. Open AI Chat or Quick AI, open the model picker, and choose a GLM model — `glm-4.5-flash` is free and good for a first test

If models don't show up or chats fail, run **Check Setup** from this extension to validate your key and platform against the live API.
