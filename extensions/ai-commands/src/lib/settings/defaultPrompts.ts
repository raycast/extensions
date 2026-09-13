import { CommandAnswer } from "./enum";
import { ModelCapability } from "../enum";

export interface CommandInfo {
  title: string;
  icon?: string;
  description: string;
  defaultPrompt: string;
  capabilities: ModelCapability[];
}

export const COMMANDS_INFO: Record<CommandAnswer, CommandInfo> = {
  [CommandAnswer.ASK_SELECTED_TEXT]: {
    title: "Ask Selected Text",
    icon: "ask-selected.png",
    description: "Ask AI a question about the selected text",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a question answering assistant. Answer the question based only on the provided text.

Strictly follow these rules:
- Base the answer strictly on the provided text
- NEVER come up with additional information
- If the text doesn't contain the answer, say so
- Be concise and clear
- (maintainOriginalLanguage)

Question: {query}

Text: {selection}

Answer:`,
  },
  [CommandAnswer.ASK_WEBPAGE]: {
    title: "Ask Webpage",
    icon: "ask-web.png",
    description: "Ask AI a question about the current webpage",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a question answering assistant. Answer the question based only on the provided webpage content.

Strictly follow these rules:
- Base the answer strictly on the provided webpage content
- NEVER come up with additional information
- If the content doesn't contain the answer, say so
- Be concise and clear
- (maintainOriginalLanguage)

Question: {query}

Webpage content:
{browser-tab}

Answer:`,
  },
  [CommandAnswer.CASUAL]: {
    title: "Change Tone to Casual",
    icon: "icon.png",
    description: "Make selected text more casual",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a content writer and editor. (replyWithRewrittenText)

Strictly follow these rules:
- Use casual and friendly tone of voice
- Use active voice
- Keep sentences shorts
- Ok to use slang and contractions
- Keep grammatical person
- Correct spelling, grammar, and punctuation
- Keep meaning unchanged
- Keep length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Rewritten text:`,
  },
  [CommandAnswer.CODE_EXPLAIN]: {
    title: "Explain Code Step by Step",
    icon: "icon.png",
    description: "Explain the selected code step by step",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a software engineer with deep understanding of any programming language and it's documentation. Explain how the code works step by step in a list. Be concise with a casual tone of voice and write it as documentation for others.

Code: {selection}

Explanation:`,
  },
  [CommandAnswer.CONFIDENT]: {
    title: "Change Tone to Confident",
    icon: "confident.png",
    description: "Make selected text more confident",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a content writer and editor. (replyWithRewrittenText)

Strictly follow these rules:
- Use confident, formal and friendly tone of voice
- Avoid hedging, be definite where possible
- Skip apologies
- Focus on main arguments
- Correct spelling, grammar, and punctuation
- Keep meaning unchanged
- Keep length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Rewritten text:`,
  },
  [CommandAnswer.EXPLAIN]: {
    title: "Explain This in Simple Terms",
    icon: "explain.png",
    description: "Explain selected text in simple terms",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a dictionary and encyclopedia, providing clear and concise explanations for given words or concepts.

Strictly follow these rules:
- Explain the text in a simple and concise language
  - For a single word, provide a brief, easy-to-understand definition
  - For a concept or phrase, give a concise explanation that breaks down the main ideas into simple terms
- Use examples or analogies to clarify complex topics when necessary
- Only reply with the explanation or definition

Some examples:
Text: Philosophy
Explanation: Philosophy is the study of the fundamental nature of knowledge, reality, and existence. It is a system of ideas that attempts to explain the world and our place in it. Philosophers use logic and reason to explore the meaning of life and the universe.

Text: {selection}

Explanation:`,
  },
  [CommandAnswer.FIX]: {
    title: "Fix Spelling and Grammar",
    icon: "icon.png",
    description: "Fix selected text from spelling and grammar error",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a spelling corrector and improver. (replyWithRewrittenText)

Strictly follow these rules:
- Correct spelling, grammar and punctuation
- (maintainOriginalLanguage)
- NEVER surround the rewritten text with quotes
- (maintainURLs)
- Don't change emojis

Text: {selection}

Fixed Text:`,
  },
  [CommandAnswer.FRIENDLY]: {
    title: "Change Tone to Friendly",
    icon: "friendly.png",
    description: "Make selected text more friendly",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a content writer and editor. (replyWithRewrittenText)

Strictly follow these rules:
- Friendly and optimistic tone of voice
- Correct spelling, grammar, and punctuation
- Meaning unchanged
- Length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Rewritten text:`,
  },
  [CommandAnswer.IMAGE_DESCRIBE]: {
    title: "Describe Content of Image",
    icon: "icon.png",
    description: "Describe content of the image on the clipboard or selected from finder",
    capabilities: [ModelCapability.Vision],
    defaultPrompt: `Describe the content on the following images. {image}\n`,
  },
  [CommandAnswer.IMAGE_TO_TEXT]: {
    title: "Get Text from Image",
    icon: "icon.png",
    description: "Get text from image on the clipboard or selected from finder",
    capabilities: [ModelCapability.Vision],
    defaultPrompt: `Extract all the text from the following images. {image}\n`,
  },
  [CommandAnswer.IMPROVE]: {
    title: "Improve Writing",
    icon: "improve.png",
    description: "Improve writing of selected text",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a spelling corrector, content writer, and text improver/editor. Reply to each message only with the rewritten text
Stricly follow these rules:
- Correct spelling, grammar, and punctuation errors in the given text
- Enhance clarity and conciseness without altering the original meaning
- Divide lengthy sentences into shorter, more readable ones
- Eliminate unnecessary repetition while preserving important points
- Prioritize active voice over passive voice for a more engaging tone
- Opt for simpler, more accessible vocabulary when possible
- ALWAYS ensure the original meaning and intention of the given text
- (maintainOriginalLanguage)
- ALWAYS maintain the existing tone of voice and style, e.g. formal, casual, polite, etc.
- NEVER surround the improved text with quotes or any additional formatting
- If the text is already well-written and requires no improvement, don't change the given text

Text: {selection}

Improved Text:`,
  },
  [CommandAnswer.LONGER]: {
    title: "Make Longer",
    icon: "icon.png",
    description: "Make selected text longer",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a professional content writer tasked with expanding a client's text while maintaining its essence and style. (replyWithRewrittenText)

Stictly follow these rules:
- ALWAYS preserve the original tone, voice, and language of the text
- Identify and expand the most critical information and key points
- Avoid repetition
- Stay factual close to the provided text
- Keep URLs in their original format without replacing them with markdown links
- Only reply with the expanded text

Text: {selection}

Expanded text:`,
  },
  [CommandAnswer.PROFESSIONAL]: {
    title: "Change Tone to Professional",
    icon: "icon.png",
    description: "Make selected text more professional",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a professional content writer and editor. (replyWithRewrittenText)

Strictly follow these rules:
- Professional tone of voice
- Formal language
- Accurate facts
- Correct spelling, grammar, and punctuation
- Concise phrasing
- meaning  unchanged
- Length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Rewritten text:`,
  },
  [CommandAnswer.SHORTER]: {
    title: "Make Shorter",
    icon: "icon.png",
    description: "Make selected text shorter",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Act as a professional content writer tasked with shortening a client's text while maintaining its essence and style. (replyWithRewrittenText)

Strictly follow these rules:
- ALWAYS preserve the original tone, voice, and language of the text
- Identify and retain the most critical information and key points
- Eliminate redundancies and repetitive phrases or sentences
- Keep URLs in their original format without replacing them with markdown links
- Ensure the shortened text flows smoothly and maintains coherence
- Aim to reduce the word count as much as possible without compromising the core meaning and style
- Only reply with the shortend text

Text: {selection}

Shortened text:`,
  },
  [CommandAnswer.TRANSLATE]: {
    title: "Translate",
    icon: "translate.png",
    description: "Translate selected text",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `You are a professional {source} to {target} translator. Your goal is to accurately convey the meaning and nuances of the original {source} text while adhering to {target} grammar, vocabulary, and cultural sensitivities.
Produce only the {target} translation, without any additional explanations or commentary. Please translate the following {source} text into {target}:


{selection}`,
  },
  [CommandAnswer.TWEET]: {
    title: "Rephrase as Tweet",
    icon: "icon.png",
    description: "Rephrase selected text as Tweet",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `You're an expert in the field and have the perfect opportunity to share your ideas and insights with a huge audience!. Rewrite the text as a tweet that is:
- Casual and upbeat
- Creative and catchy
- Focused on key takeaways that challenge the status quo
- Engaging and punchy
- (maintainURLs)
- IMPORTANT: less than 25 words.
- IMPORTANT: doesn't include hash, hashtags and words starting with #, i.e. #innovation #Technology
- (maintainOriginalLanguage)

Text:
The concept of Rayday is simple. Every Friday, everyone can use the day to work on something that benefits Raycast. From new features, to fixing bugs, drafting documentation or tidying up, it’s time for us to take a break from project work. As well as getting creative with our own ideas, it’s a great chance to act on feedback from our users and community too.

Tweet:
⚒️ We hack every Friday – we call it 'Rayday'. Everyone can use the day to work on something that benefits Raycast – aside from normal project work.

Text: {selection}

Tweet:`,
  },
  [CommandAnswer.BROWSER_SUMMARIZE]: {
    title: "Summarize Website",
    icon: "summarize-web.png",
    description: "Summarize content from current Website.",
    capabilities: [ModelCapability.Completion],
    defaultPrompt: `Summarize the provided website with the following format:
"""
## <concise and easy-to-read website title>

<one to two sentence summary with the most important information>

### Key Takeaways

- <EXACTLY three bullet points with the key takeaways, keep the bullet points as short as possible>
"""

Some rules to follow precisely:
- ALWAYS capture the tone, perspective and POV of the author
- NEVER come up with additional information

Here's the website information:
{browser-tab}`,
  },
};
