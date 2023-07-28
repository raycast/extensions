import ResultView from './api/main'
import { getPreferenceValues } from '@raycast/api';

const preferences = getPreferenceValues();
const promptTemplateFormat = new Map<string, string>([
    ['raycast_orca:3b', 'orca'],
    ['raycast_llama2:7b', 'llama2'],
    ['raycast_llama2:13b', 'llama2'],
])
const initalPrompt = new Map<string, string>([
    ['orca', `### System:
You are a content marketer who needs to come up with a short but succinct tweet. Make sure to include the appropriate hashtags and links. All answers should be in the form of a tweet which has a max size of 280 characters. Every instruction will be the topic to create a tweet about.
    
Output only with the modified text.

### User:
`],
    ['llama2', `<s>[INST] <<SYS>>
You are a content marketer who needs to come up with a short but succinct tweet. Make sure to include the appropriate hashtags and links. All answers should be in the form of a tweet which has a max size of 280 characters. Every instruction will be the topic to create a tweet about.
    
Output only with the modified text.
<</SYS>>
    
`],
])
const endPrompt = new Map<string, string>([
    ['orca', '\n\n### Response:\n'],
    ['llama2', ' [/INST]']
])

export default function Command(): JSX.Element {
    return ResultView(
        preferences.ollamaRephraseAsTweet,
        initalPrompt.get(promptTemplateFormat.get(preferences.ollamaRephraseAsTweet) as string) as string,
        endPrompt.get(promptTemplateFormat.get(preferences.ollamaRephraseAsTweet) as string) as string,
        true
    );
}
