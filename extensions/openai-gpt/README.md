# OpenAI GPT

<p align="center">
   <img src="assets/openai-logo.png" height="128">
   <h1 align="center">OpenAI GPT</h1>
 </p>

## Overview

A [Raycast](https://raycast.com/) extension that lets you interact with [OpenAI GPT](https://platform.openai.com/).

Warning: Please comply with the [OpenAI Usage Policy](https://openai.com/policies/usage-policies) while using this extension.

To use this extension, you must have an OpenAI API account, obtain your API key, and add it during the extension configuration screen.

You can find your API key in ["View API keys"](https://platform.openai.com/account/api-keys) under your profile settings.

The interface of the extension follows the interface of the OpenAI Playground.

## Actions

`Send Prompt`: send entered prompt to GPT.

`Copy Answer to Clipboard`: copy the last answer from GPT to the system's clipboard.

`Load an Example`: load an example of GPT usage into your prompt. Examples are taken from the OpenAI website.

`Check Examples on OpenAI Website`: open a browser and go to [OpenAI Example Page](https://platform.openai.com/examples).

`Change API Key`: open Raycast extension preference where you can change the API key.

## Parameters

You can set different parameters for the AI model:

`AI Model`: type of the model you want to use. `gpt-4` is the most powerful one for now, but `gpt-3.5-turbo` is cheaper, faster, and almost as capable.

`Temperature`: controls randomness of the AI model. The lower it is, the less random (and "creative") the results will be.

`Maximum Tokens`: limit for the number of tokens the AI model will generate in the response. You can see a live preview of how many tokens your prompt has underneath the `Prompt` box.

`Top P`: controls response diversity and is similar in effect to the `Temperature` parameter.

`Frequency Penalty`: controls how repetitive responses can get. Increasing the parameter lowers the chance of repetition.

`Probability Penalty`: controls how novel responses can get. Increasing the parameter raises the chance for novel answers.

### Supported AI Models

1. `gpt-4`
2. `gpt-3.5-turbo`
3. `text-davinci-003`
4. `text-davinci-002`
5. `text-curie-001`
6. `text-babbage-001`
7. `text-ada-001`

## Token Count

OpenAI API charges based on the number of total tokens, i.e., the number of tokens you submit in the prompt plus the number of tokens you got in response. Current prices are listed on [Open AI Pricing page](https://openai.com/api/pricing/).

Tokens represent the length of your prompt. For English text, 1 token is approximately 4 characters or 0.75 words. As a point of reference, the collected works of Shakespeare are about 900,000 words or 1.2M tokens.

Extension dynamically calculates the number of tokens your prompt has based on [open source GPT3 Encoder library](https://github.com/latitudegames/GPT-3-Encoder). After the answer has been received, the `Prompt token count` is updated directly with the token usage from the OpenAI API response and represents an accurate count of tokens OpenAI is charging you.
