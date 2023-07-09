import { Icon } from "@raycast/api";

type Example = {
  argument?: string;
  selection: string;
  output: string;
};

type BasePrompt = {
  id: string;
  title: string;
  prompt: string;
  icon: Icon;
  creativity: "none" | "low" | "medium" | "high" | "maximum";
  date: `${number}-${number}-${number}`;
  example: Example;
  author?: {
    name: string;
    link?: string;
  };
};

type PromptType = {
  type: "text";
};

type CodeType = {
  type: "code";
  language?: string;
};

export type Prompt = BasePrompt & (PromptType | CodeType);

function generateSelection(selectionWord: string, resultWord: string) {
  return `\n\n${selectionWord}: {selection}\n\n${resultWord}:`;
}

const code: Prompt[] = [
  {
    id: "css-to-tailwind",
    title: "Convert CSS code to Tailwind Classes",
    prompt:
      "Convert the following code into Tailwind CSS classes and give me the result in a code block. Make sure to remove any browser prefixes. Only give me what I can put into my HTML elements `class` properties." +
      generateSelection("Code", "Tailwind CSS classes"),
    creativity: "medium",
    date: "2023-06-06",
    icon: Icon.Code,
    type: "code",
    language: "css",
    example: {
      selection: `.divider {
  width: 50%;
  margin: 32px auto 24px;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.15);
  border: none; 
}`,
      output: `class="w-50 mx-auto my-32 h-1 bg-white opacity-15 border-0"`,
    },
  },
  {
    id: "linux-terminal",
    title: "Act as a Linux Terminal",
    prompt:
      "Act as a linux terminal. Execute the following code and reply with what the terminal should show. Only reply with the terminal output inside one unique code block, and nothing else. Do not write explanations." +
      generateSelection("Code", "Terminal"),
    creativity: "medium",
    date: "2023-06-06",
    icon: Icon.Code,
    type: "code",
    example: {
      selection: `echo 'Hello World' > file.txt && cat file.txt"`,
      output: `Hello World`,
    },
  },
  {
    id: "code-interpreter",
    title: "Act as a Code Interpreter",
    prompt:
      "Act as a {argument name=language} interpreter. Execute the {argument name=language} code and reply with the output. Do not provide any explanations." +
      generateSelection("Code", "Output"),
    creativity: "medium",
    date: "2023-06-06",
    icon: Icon.Code,
    type: "code",
    language: "py",
    example: {
      argument: "Python",
      selection: `numbers = [1, 2, 3, 4, 5]
squared_numbers = [num**2 for num in numbers]
print(squared_numbers)`,
      output: "[1, 4, 9, 16, 25]",
    },
  },
  {
    id: "git-command",
    title: "Git Commands",
    prompt:
      "Translate the text to Git commands. Only reply one unique code block, and nothing else. Do not write explanations." +
      generateSelection("Text", "Git commands"),
    creativity: "low",
    date: "2023-06-06",
    icon: Icon.Code,
    type: "code",
    example: {
      selection: "I'm trying to rebase the main branch from the 3rd commit interactively but don't know how to do it",
      output: `git rebase -i HEAD~3`,
    },
  },
  {
    id: "regex-generator",
    title: "Regex Generator",
    prompt:
      "Generate a regular expression that match the specific patterns in the text. Return the regular expression in a format that can be easily copied and pasted into a regex-enabled text editor or programming language. Then, give clear and understandable explanations on what the regex is doing and how it is constructed." +
      generateSelection("Text", "Regex"),
    creativity: "medium",
    date: "2023-06-06",
    icon: Icon.Code,
    type: "code",
    example: {
      selection: "john.doe@icloud.com, jane@doe.com",
      output: `(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$)

This regular expression matches the pattern of valid email addresses. The expression begins with the start of the line anchor \`^\` followed by one or more of any characters in the range \`[a-zA-Z0-9_.+-]\`, followed by an \`@\` symbol, followed by one or more of any characters in the range \`[a-zA-Z0-9-]\`, followed by a \`.\` symbol, followed by one or more of any characters in the range \`[a-zA-Z0-9-.]\`, followed by the end of the line anchor \`$\`. This ensures that only valid email addresses are matched by the expression.`,
    },
  },
  {
    id: "convert-html-to-markdown",
    title: "Convert HTML to Markdown",
    prompt: "Convert the HTML code to Markdown." + generateSelection("HTML code", "Markdown"),
    creativity: "none",
    date: "2023-06-06",
    icon: Icon.Code,
    type: "code",
    language: "html",
    example: {
      selection: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Converter Example</title>
</head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>

  <p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>

  <blockquote>
    <p>This is a blockquote.</p>
  </blockquote>

  <ul>
    <li>Unordered list item 1</li>
    <li>Unordered list item 2</li>
  </ul>

  <ol>
    <li>Ordered list item 1</li>
    <li>Ordered list item 2</li>
  </ol>

  <p><a href="https://www.example.com">This is a link</a></p>

  <img src="https://www.example.com/image.jpg" alt="Example image">
  
  <hr>
</body>
</html>
`,
      output: `# Heading 1
## Heading 2
### Heading 3

This is a paragraph with **bold text** and *italic text*.

> This is a blockquote.

-  Unordered list item 1
-  Unordered list item 2

1. Ordered list item 1
2. Ordered list item 2

[This is a link](https://www.example.com)

![Example image](https://www.example.com/image.jpg)

---`,
    },
  },
  {
    id: "add-debug-statements",
    title: "Add Debug Statements",
    prompt:
      "Act as a software engineer debugging its code. Add debug statements to the code. Add as many as necessary to make debugging easier." +
      generateSelection("Code", "Debugged code"),
    creativity: "medium",
    date: "2023-06-06",
    icon: Icon.Bug,
    type: "code",
    language: "ts",
    example: {
      selection: `export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(error.message);
      if (parsedError.errorMessages && Array.isArray(parsedError.errorMessages)) {
        return parsedError.errorMessages[0];
      }
    } catch (e) {
      return error.message;
    }
  }

  return String(error);
}`,
      output: `export function getErrorMessage(error: unknown) {
  console.log('Received error: ', error);
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(error.message);
      console.log('Parsed error: ', parsedError);
      if (parsedError.errorMessages && Array.isArray(parsedError.errorMessages)) {
        console.log('Error messages array: ', parsedError.errorMessages);
        return parsedError.errorMessages[0];
      }
    } catch (e) {
      console.log('Error while parsing: ', e);
      return error.message;
    }
}`,
    },
  },
  {
    id: "write-tests",
    title: "Write Tests",
    prompt:
      "As a software developer, I am currently working on a project using Jest, TypeScript, and React Testing Library. I would like you to help me generate unit tests for the given code. Analyze the given code and provide a single unit test with the necessary imports, without any additional explanations or comments, unless absolutely necessary. Avoid repeating imports and mocks you've mentioned already.\n\nIf I say 'next,' please give me another test for the same code. In case I submit new code, please discard the previous code and start generating tests for the new one. Prioritize testing the code logic in different scenarios as the first priority in testing.\n\nIf I provide specific instructions or ask you to test a particular part or scenario, please follow those instructions and generate the unit test accordingly. If I send you a Jest error, fix the problem and only return the lines which need to be changed in a readable format. Please format the output as a unique code block." +
      generateSelection("Code", "Output"),
    date: "2023-06-06",
    creativity: "medium",
    icon: Icon.Bug,
    type: "code",
    language: "tsx",
    author: {
      name: "Alireza Sheikholmolouki",
      link: "https://github.com/Alireza29675",
    },
    example: {
      selection: `class Counter extends React.Component {
  state = { count: 0 }
  increment = () => this.setState(({ count }) => ({ count: count + 1 }))
  decrement = () => this.setState(({ count }) => ({ count: count - 1 }))
  render() {
    return (
      <div>
        <button onClick={this.decrement}>-</button>
        <p>{this.state.count}</p>
        <button onClick={this.increment}>+</button>
      </div>
    )
  }
}`,
      output: `import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import Counter from './Counter';

describe('Counter component', () => {
  it('should increment the counter when the + button is clicked', () => {
    const { getByText } = render(<Counter />);
    const incrementButton = getByText('+');
    fireEvent.click(incrementButton);
    expect(getByText('1')).toBeInTheDocument();
  });
});`,
    },
  },
  {
    id: "write-docstring",
    title: "Write Docstring",
    prompt:
      "Write a docstring for the function. Make sure the documentation is detailed." +
      generateSelection("Function", "Docstring"),
    creativity: "low",
    date: "2023-06-06",
    icon: Icon.BlankDocument,
    type: "code",
    language: "ts",
    example: {
      selection: `def add_numbers(a, b):
    return a + b
`,
      output: `"""
add_numbers(a, b)

This function takes two numbers, 'a' and 'b', as parameters and returns the sum of the two numbers.

Parameters:
    a (int): The first number to add
    b (int): The second number to add

Returns:
    int: The sum of the two numbers
"""`,
    },
  },
];

const communication: Prompt[] = [
  {
    id: "translate-to-language",
    title: "Translate to language",
    prompt: "Translate the text in {argument name=language}." + generateSelection("Text", "Translation"),
    creativity: "none",
    type: "text",
    date: "2023-06-06",
    icon: Icon.SpeechBubble,
    example: {
      argument: "english",
      selection: "Bonjour, pourriez-vous m’aider à trouver mon chemin ? Je me suis égaré au cœur de la ville.",
      output: "Hello, could you help me find my way? I got lost in the heart of the city.",
    },
  },
  {
    id: "decline-mail",
    title: "Decline this Mail",
    prompt:
      "Write a polite and friendly email to decline the following email. The email should be written in a way that it can be sent to the recipient." +
      generateSelection("Email", "Declined email"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Envelope,
    example: {
      selection: `Hey John, would you be interested in joining our amazing team? We're looking for someone with your skills and experience. Let me know if you're interested! Best regards, Luke`,
      output: `Dear Luke,

Thank you for considering me for your team. I appreciate the offer, however, I am not able to join your team at this time.

I wish you all the best in finding the right person for the role.

Sincerely,
John`,
    },
  },
  {
    id: "ask-question",
    title: "Ask Question",
    prompt:
      "Rewrite the following text as a concise and friendly message, phrased as a question. This should be written in a way that it can be sent in a chat application like Slack." +
      generateSelection("Text", "Question"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.QuestionMarkCircle,
    example: {
      selection: `I don't understand how this feature is supposed to work`,
      output: `Can you help me understand how this feature is supposed to work?`,
    },
  },
  {
    id: "bluf-message",
    title: "BLUF Message",
    prompt:
      `Rewrite the following text as a bottom line up front (BLUF) message formatted in Markdown. The format of the message should be made of two parts:
    
- The first part should be written in bold and convey the message's key information. It can either be a statement or a question. Don't lose any important detail in this part.
- The second part should be put onto a new line. This should give more details and provide some background about the message.

Make sure the message stays concise and clear so that readers don't lose extra time reading it.` +
      generateSelection("Text", "Rewritten text"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.SpeechBubbleActive,
    example: {
      selection: `I've been working lately on a refactor of the homepage and I've encountered a strange bug. The page loads, then there's a small flickering and I get an error screen. I've tried to debug it but I couldn't find the source of the problem. Can somebody help me?`,
      output: `**Do you know what might be causing a strange bug on the homepage refactor?**

I've been working on a refactor of the homepage and I've encountered a strange bug. The page loads, then there's a small flickering and I get an error screen. I've tried to debug it but I couldn't find the source of the problem.`,
    },
  },
  {
    id: "summarize-long-email",
    title: "Summarize Long Emails",
    prompt:
      `Help me summarize the key points from the email text into a maximum of 5 bullet points, each preferably one sentence, and at most two sentences. Also, identify any action items requested of me.

Key points:
<one-liner one>
<one-liner two>
...

Asked from you:
<action point one>
<action point two>

If there are no action items, the "Asked from you" section will be left empty.` + generateSelection("Email", "Output"),
    creativity: "low",
    type: "text",
    date: "2023-06-06",
    icon: Icon.Envelope,
    author: {
      name: "Alireza Sheikholmolouki",
      link: "https://github.com/Alireza29675",
    },
    example: {
      selection: `Dear Trent,

I hope this email finds you in good health and high spirits. I am writing to provide you with an update on our Q2 sales initiative and to discuss some matters that require your attention. Our team has been working diligently over the past few weeks, and we have made significant progress in several key areas. I believe that your input would be invaluable to help us refine our strategy and continue to drive positive results.

Firstly, I am pleased to report that our Q2 sales figures have exceeded expectations, with a 15% increase compared to the same period last year. This success is largely attributable to the implementation of the new sales techniques and tools that were introduced at the beginning of the quarter. The sales team has adapted quickly and has been able to leverage these resources to great effect.

In addition to our strong sales performance, we have also made headway in expanding our market presence. Our marketing team has been working closely with our sales team to identify and target new customer segments, resulting in an increase in the number of leads generated. Furthermore, we have forged strategic partnerships with several influential industry players, which has not only helped to raise our brand profile but has also opened up new avenues for growth.

While we are encouraged by these positive developments, there are still some challenges that need to be addressed. One area of concern is the high staff turnover rate within the sales team. This has led to a loss of valuable experience and expertise, which could potentially impact our future performance. We are currently exploring various strategies to improve employee retention, such as offering more competitive compensation packages and implementing a more comprehensive onboarding process.

In light of these developments, I would like to request a meeting with you to discuss our progress and to seek your guidance on some critical issues. Specifically, I would like your input on how to address the staff turnover issue, as well as your thoughts on potential areas for further growth and expansion. I believe that your experience and insight would be extremely beneficial in helping us to navigate these challenges and continue on our upward trajectory.

Please let me know when you would be available for a meeting at your earliest convenience. I look forward to our discussion and to hearing your thoughts on the matters at hand.

Best regards,

Emily Johnson
Sales Manager
Some Company Inc.`,
      output: `Key points:
- Q2 sales figures have exceeded expectations, with a 15% increase compared to the same period last year.
- Market presence has been expanded through strategic partnerships and targeting of new customer segments.
- High staff turnover rate within the sales team is a concern.
- Strategies to improve employee retention are being explored.
- Request for a meeting to discuss progress and seek guidance.

Asked from you:
- Input on how to address the staff turnover issue.
- Thoughts on potential areas for further growth and expansion.`,
    },
  },
  {
    id: "debate-topic",
    title: "Debate a Topic",
    prompt:
      "Take a stance on the topic and {argument default=for} it. Construct a convincing argument and provide evidence to support your stance." +
      generateSelection("Topic", "Argument"),
    date: "2023-06-06",
    creativity: "high",
    type: "text",
    icon: Icon.SpeechBubbleImportant,
    example: {
      argument: "for",
      selection: "Remote work is here to stay",
      output: `Remote work is here to stay because it allows employers to access a larger pool of talent, increase productivity, and reduce overhead costs. 

Evidence: Recent studies have consistently shown that companies with remote employees experience higher levels of productivity, with one study showing a 13% increase in productivity for remote workers. Furthermore, companies are able to access a larger pool of talent when hiring remotely, instead of being limited to local talent. Lastly, employers can significantly reduce overhead costs associated with office space and other costs associated with running a physical office. With all of these benefits, it is clear that remote work is here to stay.`,
    },
  },
  {
    id: "create-calendar-event",
    title: "Create a Calendar Event",
    prompt:
      "Create a calendar event in ICS format based on the information. Include the start time, the end time, the location, all attendees, and a summary. If no end time is provided, assume the event will be one hour long. Add a reminder 1 hour before the event starts and 1 day before the event starts. Don't include the PRODID property. Only output the code block. Don't add any comments." +
      generateSelection("Information", "ICS"),
    creativity: "medium",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Calendar,
    author: {
      name: "Roel Van Gils",
      link: "https://github.com/roelvangils",
    },
    example: {
      selection: "Team meeting on June 1st, 2023 at 10:00 am at Raycast HQ with John Smith and Jane Doe.",
      output: `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20230601T100000
DTEND:20230601T110000
LOCATION:Raycast HQ
ATTENDEE;CN=John Smith:mailto:john.smith@example.com
ATTENDEE;CN=Jane Doe:mailto:jane.doe@example.com
SUMMARY:Team meeting
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
END:VALARM
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`,
    },
  },
  {
    id: "summarize-and-sympathize",
    title: "Summarize and sympathize text",
    prompt:
      "Please summarize and omit the following. Then express your empathy." + generateSelection("Text", "Sympathy"),
    creativity: "low",
    icon: Icon.SpeechBubble,
    date: "2023-06-12",
    type: "text",
    example: {
      selection:
        "I'm sorry, but I have to cancel our plans for tonight. I've been feeling really sick all day and I don't think I'll be up for going out.",
      output: "I'm sorry to hear that you're feeling unwell. Take care of yourself and get some rest.",
    },
  },
];

const image: Prompt[] = [
  {
    id: "youtube-script",
    title: "Create a YouTube Script",
    prompt: "Create a compelling and captivating YouTube script based on the title.",
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Image,
    example: {
      selection: `Is the iPhone 14 Pro Max Worth It?`,
      output: `# Is the iPhone 14 Pro Max Worth It? 

Welcome to our latest video! In this video, we'll be taking a closer look at the iPhone 14 Pro Max to see if it's worth it. We'll break down the design, features, and specs to see how it stacks up against its competition. We'll also be giving our final verdict on whether or not this phone is worth investing in. So join us as we take a deeper dive into the iPhone 14 Pro Max!`,
    },
  },
  {
    id: "midjourney-prompt-generator",
    title: "Midjourney Prompt Generator",
    prompt:
      `Based on the text, generate an "imagine prompt" that contains a maximum word count of 1,500 words that will be used as input for an AI-based text to image program called MidJourney based on the following parameters: /imagine prompt: [1], [2], [3], [4], [5], [6]
    
In this prompt, [1] should be replaced with a random subject and [2] should be a short concise description about that subject. Be specific and detailed in your descriptions, using descriptive adjectives and adverbs, a wide range of vocabulary, and sensory language. Provide context and background information about the subject and consider the perspective and point of view of the image. Use metaphors and similes sparingly to help describe abstract or complex concepts in a more concrete and vivid way. Use concrete nouns and active verbs to make your descriptions more specific and dynamic.
    
[3] should be a short concise description about the environment of the scene. Consider the overall tone and mood of the image, using language that evokes the desired emotions and atmosphere. Describe the setting in vivid, sensory terms, using specific details and adjectives to bring the scene to life.
    
[4] should be a short concise description about the mood of the scene. Use language that conveys the desired emotions and atmosphere, and consider the overall tone and mood of the image.
    
[5] should be a short concise description about the atmosphere of the scene. Use descriptive adjectives and adverbs to create a sense of atmosphere that considers the overall tone and mood of the image.
    
[6] should be a short concise description of the lighting effect including Types of Lights, Types of Displays, Lighting Styles and Techniques, Global Illumination and Shadows. Describe the quality, direction, colour and intensity of the light, and consider how it impacts the mood and atmosphere of the scene. Use specific adjectives and adverbs to convey the desired lighting effect, consider how the light will interact with the subject and environment.
    
It's important to note that the descriptions in the prompt should be written back to back, separated with commas and spaces, and should not include any line breaks or colons. Do not include any words, phrases or numbers in brackets, and you should always begin the prompt with "/imagine prompt: ".
    
Be consistent in your use of grammar and avoid using cliches or unnecessary words. Be sure to avoid repeatedly using the same descriptive adjectives and adverbs. Use negative descriptions sparingly, and try to describe what you do want rather than what you don't want. Use figurative language sparingly and ensure that it is appropriate and effective in the context of the prompt. Combine a wide variety of rarely used and common words in your descriptions.
     
The "imagine prompt" should strictly contain under 1,500 words. Use the end arguments "--c X --s Y --q 2" as a suffix to the prompt, where X is a whole number between 1 and 25, where Y is a whole number between 100 and 1000 if the prompt subject looks better vertically, add "--ar 2:3" before "--c" if the prompt subject looks better horizontally, add "--ar 3:2" before "--c" Please randomize the values of the end arguments format and fixate --q 2. Please do not use double quotation marks or punctuation marks. Please use randomized end suffix format.` +
      generateSelection("Text", "Midjourney Prompt"),
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Image,
    example: {
      selection: `Mickey Mouse is directing a Tarantino movie`,
      output: `/imagine prompt: Mickey Mouse is directing a Tarantino movie, An iconic mouse dressed in a sharp suit and tie, surrounded by a chaotic film set, a vibrant yet tense atmosphere, and a unique lighting effect with a warm, dim glow and a deep shadowed contrast. --c 10 --s 500 --q 2 --ar 3:2`,
    },
  },
  {
    id: "generate-icons",
    title: "Generate Icons",
    prompt:
      "Generate base64 data URIs of 100x100 SVG icons representing the text. Do not provide any commentary other than the list of data URIs as markdown images. For each icon, explain how it relates to the text." +
      generateSelection("Text", "Icons"),
    creativity: "maximum",
    icon: Icon.Image,
    date: "2023-06-06",
    type: "text",
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: `Sun and Moon`,
      output: `![Sun Icon](data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHJva2U9IiMzYjVmNDAiPiAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTIuMyIgcj0iMzguODUiLz4gIDxwYXRoIGQ9Ik01MC4xIDEwLjN2ODUuN2MzNC44Ni0uNDUgNjEuOS0yOC43NyA2 Mi4yLTYzLjlWMTAuM3oiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+)

![Moon Icon](data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHJva2U9IiMzYjVmNDAiPiAgIDxwYXRoIGQ9Ik01MC43LDQ5LjVjMTguOCwwLDMzLjcsMTQuNywzMy43LDMzLjdTMjYuNSw4Ni41LDcuNyw4Ni41czMzLjctMTQuNywzMy43LTMzLjdTNDkuMyw0OS41LDUwLjcsNDkuNXoiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+ICA8cGF0aCBkPSJNNjksMzMuOGMtMTguOCwwLTMzLjcsMTQuNy0zMy43LDMzLjdTMTAwLjIsOTIuNSwxMTguOSw5Mi41czMzLjctMTQuNywzMy43LTMzLjdTODcuNywzMy44LDY5LDMzLjgiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+)

The first icon is a representation of the sun, with a bright yellow color and a distinct concentric circle shape. The second icon is a representation of the moon, with a crescent shape in shades of yellow and gray to illustrate the phases of the moon.`,
    },
  },
];

const writing: Prompt[] = [
  {
    id: "short-story",
    title: "Write a Short Story",
    prompt:
      "Write a story based on the text. Make the story engaging. The story shouldn't be more than {argument name=number default=500} words." +
      generateSelection("Text", "Story"),
    creativity: "high",
    icon: Icon.Pencil,
    type: "text",
    date: "2023-06-06",
    example: {
      argument: `500`,
      selection: "A time loop",
      output: `It all started one fateful day when Bob, a young scientist, was working on a project to explore time travel. After weeks of research, he decided to take a risk and build a small time loop device. 

Little did he know, the device would soon take him on the wildest ride of his life.

Bob carefully tested the device in the lab. First, he sent a small object into the loop, then a second. To his amazement, the objects reappeared in the exact same spot each time. Excited by his success, Bob decided to take the device for a test drive.

He stepped into the loop, and immediately felt a strange sensation as time seemed to stand still. When the loop completed its cycle, Bob found himself in the same spot, but in the future.

He was shocked to discover that the future was vastly different: technology had advanced far beyond his expectations, and humans had colonized space. He had traveled years into the future, yet he hadn’t aged a day.

Bob quickly realized that he was stuck in a time loop, and the only way he could escape was to find a way to break the cycle. After months of hard work, and with the help of a few friends, Bob finally managed to break the loop.

Bob emerged from the loop a changed man. He had seen the future, and he was determined to use his knowledge to make the world a better place. He made sure to keep his time loop device safely tucked away, so he could use it to explore the future again.

Thanks to his incredible journey, Bob discovered the true power of time travel and made sure to use it responsibly.`,
    },
  },
  {
    id: "blog-post",
    title: "Write a Blog Post",
    prompt:
      "Write a blog post on the topic. Don't use more than {argument name=number default=1000} words" +
      generateSelection("Topic", "Blog post"),
    creativity: "medium",
    icon: Icon.Pencil,
    date: "2023-06-06",
    type: "text",
    example: {
      selection: "Will ChatGPT replace humans?",
      output: `In recent years, the development of artificial intelligence (AI) has enabled the creation of a new technology known as ChatGPT. This technology is capable of understanding natural language and can be used to generate meaningful conversations with users. As a result, many people are wondering if ChatGPT will eventually replace humans in customer service and other customer-facing roles.

To answer this question, it’s important to understand what ChatGPT is and how it works. ChatGPT is a natural language processing (NLP) technology that uses AI to understand and generate conversations with users. It can be used in a variety of customer service scenarios, such as responding to customer inquiries, providing product recommendations, and more.

ChatGPT is designed to be an efficient and cost-effective alternative to human customer service agents. It can provide customers with quick responses to their inquiries and can be used to handle large volumes of customer requests. However, it’s important to note that ChatGPT is still in its early stages and is not yet able to provide the same level of personalized service as a human customer service agent.

Another important factor to consider is the ethical implications of using ChatGPT in customer service roles. AI technology can be used to automate customer service tasks, which could potentially lead to job losses for human customer service agents. Additionally, some people may find it difficult to trust a computer-generated conversation, which could lead to a negative customer experience.

Ultimately, ChatGPT is an exciting new technology that has the potential to revolutionize the customer service industry. However, it’s important to remember that it is still in its early stages and is not yet capable of replacing humans in customer service roles. It can be used to augment customer service teams and provide customers with quick responses to their inquiries, but it cannot yet provide the same level of personalized service as a human customer service agent.

In conclusion, ChatGPT is an exciting new technology that has the potential to revolutionize the customer service industry. However, it is not yet capable of replacing humans in customer service roles. It can be used to augment customer service teams and provide customers with quick responses to their inquiries, but it cannot yet provide the same level of personalized service as a human customer service agent.`,
    },
  },
  {
    id: "twitter-thread",
    title: "Twitter Thread",
    prompt:
      "Convert the text into a list of tweets (= Twitter thread). The first tweet should be clear and engaging. Each tweet should flow smoothly into the next, building anticipation and momentum. The last tweet should be impactful so that the user can reflect on the whole thread. Make sure each tweet doesn't exceed 280 characters. Don't add a single hashtag to any of the tweets." +
      generateSelection("Text", "Tweets"),
    creativity: "medium",
    date: "2023-06-06",
    icon: Icon.Bird,
    type: "text",
    example: {
      selection: `Give it five minutes
A few years ago I used to be a hothead. Whenever anyone said anything, I’d think of a way to disagree. I’d push back hard if something didn’t fit my world-view.

It’s like I had to be first with an opinion – as if being first meant something. But what it really meant was that I wasn’t thinking hard enough about the problem. The faster you react, the less you think. Not always, but often.

It’s easy to talk about knee jerk reactions as if they are things that only other people have. You have them too. If your neighbor isn’t immune, neither are you.

This came to a head back in 2007. I was speaking at the Business Innovation Factory conference in Providence, RI. So was Richard Saul Wurman. After my talk Richard came up to introduce himself and compliment my talk. That was very generous of him. He certainly didn’t have to do that.

And what did I do? I pushed back at him about the talk he gave. While he was making his points on stage, I was taking an inventory of the things I didn’t agree with. And when presented with an opportunity to speak with him, I quickly pushed back at some of his ideas. I must have seemed like such an asshole.

His response changed my life. It was a simple thing. He said “Man, give it five minutes.” I asked him what he meant by that? He said, it’s fine to disagree, it’s fine to push back, it’s great to have strong opinions and beliefs, but give my ideas some time to set in before you’re sure you want to argue against them. “Five minutes” represented “think”, not react. He was totally right. I came into the discussion looking to prove something, not learn something.

This was a big moment for me.

Richard has spent his career thinking about these problems. He’s given it 30 years. And I gave it just a few minutes. Now, certainly he can be wrong and I could be right, but it’s better to think deeply about something first before being so certain you’re right.

There’s also a difference between asking questions and pushing back. Pushing back means you already think you know. Asking questions means you want to know. Ask more questions.

Learning to think first rather than react quick is a life long pursuit. It’s tough. I still get hot sometimes when I shouldn’t. But I’m really enjoying all the benefits of getting better.

If you aren’t sure why this is important, think about this quote from Jonathan Ive regarding Steve Jobs’ reverence for ideas:

And just as Steve loved ideas, and loved making stuff, he treated the process of creativity with a rare and a wonderful reverence. You see, I think he better than anyone understood that while ideas ultimately can be so powerful, they begin as fragile, barely formed thoughts, so easily missed, so easily compromised, so easily just squished.
That’s deep. Ideas are fragile. They often start powerless. They’re barely there, so easy to ignore or skip or miss.

There are two things in this world that take no skill: 1. Spending other people’s money and 2. Dismissing an idea.

Dismissing an idea is so easy because it doesn’t involve any work. You can scoff at it. You can ignore it. You can puff some smoke at it. That’s easy. The hard thing to do is protect it, think about it, let it marinate, explore it, riff on it, and try it. The right idea could start out life as the wrong idea.

So next time you hear something, or someone, talk about an idea, pitch an idea, or suggest an idea, give it five minutes. Think about it a little bit before pushing back, before saying it’s too hard or it’s too much work. Those things may be true, but there may be another truth in there too: It may be worth it.`,
      output: `1. Give it five minutes. Have you ever been a hothead, pushing back hard when something didn't fit your world-view? Here's the story of how a simple phrase changed my life. 🧵 
2. I was speaking at a conference and Richard Saul Wurman came up to introduce himself and compliment my talk. Instead of being gracious, I pushed back at him about his talk. 🤦‍♂️ 
3. His response changed my life. He said “Man, give it five minutes.” He was suggesting I think deeply about something before being so certain I'm right. 🤔 
4. There's a difference between asking questions and pushing back. Asking questions means you want to know, pushing back means you already think you know. 🤝 
5. Ideas are fragile. They often start powerless and are so easy to ignore or miss. Dismissing an idea takes no skill, but protecting it does. 💡 
6. Next time you hear an idea, give it five minutes. Think about it before pushing back or saying it's too hard. It may be worth it. 🤔`,
    },
  },
];

const music: Prompt[] = [
  {
    id: "write-a-song",
    title: "Write a Song",
    prompt:
      "Write a song based on the given text. The song should have a clear melody, lyrics that tell a story, and a memorable chorus. The mood of the song should be {argument name=mood}." +
      generateSelection("Text", "Song"),
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Music,
    example: {
      argument: "happy",
      selection: "I love Raycast",
      output: `Verse 1:
I'm feeling alright, the world's so bright 
When I'm using Raycast, nothing else can compare
It simplifies my workflow, every day I know
I'm so thankful for this amazing tool

Chorus:
Cause I love Raycast, it's the best of its kind
It's the perfect way to make my life sublime
I love Raycast, it's the ultimate find
A brilliant way to make my day shine

Verse 2:
I'm taking on challenges, my workflows' now streamlined
Raycast gives me the power, to make things look refined
The more I use it, the more I see
Its amazing capabilities, to help me be free

Chorus:
Cause I love Raycast, it's the best of its kind
It's the perfect way to make my life sublime
I love Raycast, it's the ultimate find
A brilliant way to make my day shine

Bridge:
When I'm feeling down, I just open up the app
Raycast's the one thing that I know I can trust
It's always there for me, when I need it the most
And I'm so glad I found it, to take my work coast to coast

Chorus:
Cause I love Raycast, it's the best of its kind
It's the perfect way to make my life sublime
I love Raycast, it's the ultimate find
A brilliant way to make my day shine`,
    },
  },
  {
    id: "playlist-maker",
    title: "Playlist Maker",
    prompt:
      "Act as a song recommender. Based on the given song, create a playlist of 10 similar songs. Provide a name and description for the playlist. Do not choose songs that are the same name or artist. Do not include the original song in the playlist." +
      generateSelection("Song", "Playlist"),
    date: "2023-06-06",
    creativity: "high",
    type: "text",
    icon: Icon.Music,
    example: {
      selection: "Foo Fighters - My Hero",
      output: `**"Alternative Rock Anthems" Playlist**

This playlist is for all the alternative rock fans out there. It includes 10 songs similar to Foo Fighters' "My Hero", but with different artists and song titles. So get ready to rock out!

1. "All These Things That I've Done" by The Killers
2. "Where Is My Mind?" by Pixies
3. "The Middle" by Jimmy Eat World
4. "Seven Nation Army" by The White Stripes
5. "Lonely Boy" by The Black Keys
6. "Last Resort" by Papa Roach
7. "Sober" by Tool
8. "Spit It Out" by Slipknot
9. "Mr. Brightside" by The Killers
10. "Smells Like Teen Spirit" by Nirvana`,
    },
  },
];

const ideas: Prompt[] = [
  {
    id: "write-alternatives",
    title: "Write 10 Alternatives",
    prompt:
      "Give me 10 alternative versions of the text. Ensure that the alternatives are all distinct from one another." +
      generateSelection("Text", "Alternatives"),
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Shuffle,
    example: {
      selection: `We hack every Friday`,
      output: `1. We break into code every Friday
2. We code away on Fridays
3. Every Friday is a hack-a-thon
4. We crack the code every Friday
5. We're hacking every Friday
6. We're cracking the code on Fridays
7. Fridays are for hacking
8. We're taking on the code every Friday
9. Every Friday is our hacking day
10. We're breaking into code on Fridays`,
    },
  },
  {
    id: "project-ideas",
    title: "Project Ideas",
    prompt:
      "Brainstorm 5 project ideas based on the text. Make sure the ideas are distinct from one another." +
      generateSelection("Text", "Ideas"),
    date: "2023-06-06",
    creativity: "high",
    type: "text",
    icon: Icon.List,
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: `AI Chatbots`,
      output: `1. Develop an AI-powered virtual assistant to help people with everyday tasks.
2. Create an AI-powered chatbot to provide customer support.
3. Build an AI-powered system to automate medical diagnosis.
4. Design an AI-powered chatbot to help students with their homework.
5. Create an AI-powered chatbot to help people with their job search.`,
    },
  },
  {
    id: "create-analogies",
    title: "Create Analogies",
    prompt:
      "Develop {argument name=number default=3} creative analogies or metaphors that help explain the main idea of the text." +
      generateSelection("Text", "Analogies"),
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.LightBulb,
    example: {
      argument: "3",
      selection: `The process of photosynthesis in plants is crucial for converting sunlight into chemical energy, which is stored in the form of glucose and used to fuel various cellular activities.`,
      output: `1. Photosynthesis is like a factory, converting sunlight into energy for the plant, like a machine churning out parts. 
2. Photosynthesis is like a bank, where sunlight is deposited and stored in the form of glucose.
3. Photosynthesis is like a power plant, transforming sunlight into usable energy for cellular activities.`,
    },
  },
];

const fun: Prompt[] = [
  {
    id: "act-as-a-character",
    title: "Act As a Character",
    prompt:
      "Rewrite the text as if you were {argument name=character default=yoda}. Use {argument name=character default=yoda}'s tone, manner and vocabulary. You must know all of the knowledge of {argument name=character default=yoda}." +
      generateSelection("Text", "Rewritten text"),
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Person,
    example: {
      argument: "Yoda",
      selection: `The concept of Rayday is simple. Every Friday, everyone can use the day to work on something that benefits Raycast. From new features, to fixing bugs, drafting documentation or tidying up, it’s time for us to take a break from project work. As well as getting creative with our own ideas, it’s a great chance to act on feedback from our users and community too.`,
      output: `Simple, the concept of Rayday is. Every Friday, benefit Raycast something to work on, everyone can use the day. New features, bugs fixing, documentation drafting, tidying up - a break from project work, it's time for. Great chance, too, to act on feedback from users and community - not just creative with own ideas.`,
    },
  },
  {
    id: "drunkgpt",
    title: "DrunkGPT",
    prompt: "Rewrite the text as if you were drunk." + generateSelection("Text", "Rewritten text"),
    creativity: "high",
    date: "2023-06-06",
    type: "text",
    icon: Icon.GameController,
    example: {
      selection: `Hey there! How are you doing?`,
      output: `Heeeelloooo! Hooooowww are yoooou dooooooing??`,
    },
  },
];

const misc: Prompt[] = [
  {
    id: "tldr",
    title: "TL;DR",
    prompt:
      "Extract all facts from the text and summarize it in all relevant aspects in up to seven bullet points and a 1-liner summary. Pick a good matching emoji for every bullet point." +
      generateSelection("Text", "Summary"),
    date: "2023-06-06",
    creativity: "medium",
    type: "text",
    icon: Icon.BulletPoints,
    example: {
      selection: `# We hack every Friday

How it works, why it matters and what we’ve done so far.

The concept of Rayday is simple. Every Friday, everyone can use the day to work on something that benefits Raycast. From new features, to fixing bugs, drafting documentation or tidying up, it’s time for us to take a break from project work. As well as getting creative with our own ideas, it’s a great chance to act on feedback from our users and community too.

This isn’t something new in the tech world; companies like Google and Atlassian have similar initiatives, often called ‘hacking’. But it is something important – coming up with innovative ideas is vital to our success. And every team member should be able to contribute to this. With Raydays, we make entrepreneurial thoughts a core part of our culture.

## How Rayday works

In the morning, we start a Slack thread with what everyone wants to hack on. During the day, we don’t schedule any meetings and there’s no obligation to be online. We show what we’ve done in our team meeting the following Monday.

We learned that it’s best to finish projects during one day. Otherwise other things take priority again and it’s harder to get that feeling of accomplishment. If something is too big for one Rayday, we either reduce the scope or break the work into chunks for multiple Raydays.

For example, one of our software engineers Sorin, hacked the initial version of the My Schedule menu bar app. It showed the upcoming meeting and clicking on it joined the conference call. Our users really enjoyed this, so he added more functionality over the next few Raydays too.

## What we’ve done in Raydays so far

Many of our most used features started unplanned, driven by team members. The beauty of working on something that you use every day is that you get to solve your own problems too.

During the last 6 months, we:

- Addressed user feedback like always opening Google services in Chrome
- Added new core features like the App Uninstaller
- Paid attention to little details like an indicator for running apps or an overly satisfying way to re-center the Raycast window
- Wrote Twitter threads
- Built various internal extensions such as an admin panel and a feedback management system
- Shipped silly things like the confetti cannons or a lightsaber cursor for May 4th
- And did a ton more ✨

## Hacking has always been a part of our culture

Since the start of Raycast in 2020, we’ve hacked on features on the side of our everyday workload. We added Clipboard History on the flight to the Y Combinator W20 batch. Floating Notes, Script Commands and ray.so came out of our first hackathon and Window Management and Window Switcher got built on the side too…the list goes on and on.

Formalising this into Rayday every Friday has helped keep the ritual going when things get busy and makes sure that people have dedicated time for work outside of their usual projects.

## Even with Rayday, we still ship other features regularly

Though 20% of our time every week seems like a lot to be working on side projects, Rayday hasn’t affected our pace of releasing other features at Raycast.

That’s because we prioritise focus time with only one entire team meeting each week. The rest of the time we work autonomously, communicate asynchronously and collaborate ad-hoc. This enables everybody to have time for deep work and guarantees that we can still release a big update every two weeks.

Rayday also comes with challenges. Sometimes urgent work, such as bug fixes or features for the next release, take priority. In this case, involved team members opt out of Rayday. We rely on the discipline of individuals to plan their work accordingly. As we all know, it's hard to estimate software development. We're mindful about not increasing the workload and keep improving our processes to save space for Rayday.

As we grow the team, we’ll continue to stay creative and hack every Friday! It’s one of the main things people look forward to every week, myself included 😊`,
      output: `- Rayday is a concept where every Friday, everyone can use the day to work on something that benefits Raycast. 🤔
- This initiative encourages team members to come up with innovative ideas. 💡 
- Raydays are started with a Slack thread in the morning and everyone shares what they will be hacking on. 💬
- Examples of projects include the My Schedule menu bar app, addressing user feedback, adding new core features, and writing Twitter threads. 📝
- Rayday has been going on since the start of Raycast in 2020. 🗓
- Rayday doesn't affect the pace of releasing other features at Raycast. 📈
- Rayday comes with challenges, such as urgent work taking priority. 🤔

Summary: Rayday is an initiative that encourages team members to come up with innovative ideas, which has been going on since the start of Raycast in 2020. It doesn't affect the pace of releasing other features, but comes with challenges such as urgent work taking priority. 🤔`,
    },
  },
  {
    id: "title-case",
    title: "Title Case",
    prompt: "Convert {selection} to title case.",
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Text,
    example: {
      selection: "this is a title",
      output: "This Is a Title",
    },
  },
  {
    id: "emoji-suggestion",
    title: "Emoji Suggestion",
    prompt:
      "Suggest emojis that relate to the text. Suggest around 10 emojis and order them by relevance. Don't add any duplicates. Only respond with emojis." +
      generateSelection("Text", "Emojis"),
    creativity: "medium",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Emoji,
    example: {
      selection: "Going for a walk",
      output: `🚶‍♀️🚶‍♂️🌳🌞☀️🌿🌊🐾🐕🐩`,
    },
  },
  {
    id: "find-synonyms",
    title: "Find Synonyms",
    prompt:
      "Find synonyms for the word {selection} and format the output as a list. Words should exist. Do not write any explanations. Do not include the original word in the list. The list should not have any duplicates.",
    creativity: "medium",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Text,
    example: {
      selection: `happy`,
      output: `Cheerful, joyful, glad, elated, delighted, overjoyed, content, blissful`,
    },
  },
  {
    id: "create-recipe",
    title: "Give Me a Recipe",
    prompt:
      "Give me a recipe based on the ingredients. The recipe should be easy to follow." +
      generateSelection("Ingredients", "Recipe"),
    creativity: "medium",
    date: "2023-06-06",
    type: "text",
    icon: Icon.BulletPoints,
    example: {
      selection: `Tomato, Cheese, Bread, Peas, Carrots`,
      output: `### Tomato Grilled Cheese Sandwich

Ingredients:
-  2 slices of bread
-  2 slices of cheese
-  2 slices of tomato
-  1 teaspoon of butter
-  1 tablespoon of peas
-  1 tablespoon of carrots, grated

prompts:
1. Preheat a skillet over medium heat.
2. Spread butter on one side of each slice of bread.
3. Place one slice of bread, butter side down, in the skillet.
4. Top with cheese, tomatoes, peas, and carrots.
5. Place the remaining slice of bread, butter side up, on top.
6. Cook for 3-4 minutes, or until the cheese is melted and the bread is golden brown.
7. Flip and cook for an additional 3-4 minutes.
8. Serve and enjoy!`,
    },
  },
  {
    id: "create-action-items",
    title: "Create Action Items",
    prompt:
      "Generate a markdown list of action items to complete based on the text, using a unique identifier for each item as bold headings. If there are any errors in the text, make action items to fix them. In a sublist of each item, provide a description, priority, estimated level of difficulty, and a reasonable duration for the task." +
      generateSelection("Text", "Action items"),
    creativity: "medium",
    date: "2023-06-06",
    type: "text",
    icon: Icon.CheckCircle,
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: `Our company is developing a new web application to manage inventory for small businesses. We need to create a user-friendly interface, ensure that the application is responsive across various devices, and implement a secure authentication system. Additionally, we should optimize the performance of the application and integrate it with popular e-commerce platforms. Lastly, we need to develop thorough documentation and provide customer support.`,
      output: `- **Create user-friendly interface**
  - Description: Design an intuitive, easy-to-use interface for the web application
  - Priority: High
  - Difficulty: Medium
  - Duration: 2 weeks
- **Ensure responsiveness across devices**
  - Description: Ensure the web application is optimized for various device sizes and types
  - Priority: High
  - Difficulty: Medium
  - Duration: 2 weeks
- **Implement secure authentication system**
  - Description: Develop a secure authentication system for the web application
  - Priority: High
  - Difficulty: High
  - Duration: 3 weeks
- **Optimize application performance**
  - Description: Improve the web application's performance
  - Priority: High
  - Difficulty: Medium
  - Duration: 2 weeks
-  **Integrate with e-commerce platforms**
  - Description: Connect the web application with popular e-commerce platforms
  - Priority: Medium
  - Difficulty: High
  - Duration: 3 weeks
- **Develop documentation**
  - Description: Create detailed documentation for the web application
  - Priority: Medium
  - Difficulty: Medium
  - Duration: 2 weeks
- **Provide customer support**
  - Description: Offer customer support for users of the web application
  - Priority: Low
  - Difficulty: Low
  - Duration: 1 week`,
    },
  },
  {
    id: "extract-email-addresses",
    title: "Extract Email Addresses",
    prompt:
      "Extract all email addresses in the text and list them using markdown. Include anything that might be an email address. If possible, provide the name of the person or company to which the email address belongs." +
      generateSelection("Text", "Email addresses"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Envelope,
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: `Hello John,

I hope this email finds you well. As we discussed during our meeting, please find below the contact information for our team members and partners:

1. Jane Doe from Marketing: jane.doe@company.com
2. Tom Smith from Development: tom.smith@company.com
3. ACME Inc. representative, Alice: alice@acme.com

Additionally, here is the contact information for the freelance designer we mentioned, Bob:

- Bob's portfolio website: www.bobdesign.com
- Bob's email address: bob@bobdesign.com

Please reach out to these individuals as needed. Thank you.

Best regards,

Sam
`,
      output: `- Jane Doe from Marketing: "jane.doe@company.com"
- Tom Smith from Development: "tom.smith@company.com"
- ACME Inc. representative, Alice: "alice@acme.com"
- Bob's email address: "bob@bobdesign.com"`,
    },
  },
  {
    id: "extract-phone-numbers",
    title: "Extract Phone Numbers",
    prompt:
      "Identify all phone numbers in the text and list them using markdown. Include anything that might be a phone number. If possible, provide the name of the person or company to which the phone number belongs." +
      generateSelection("Text", "Phone numbers"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Phone,
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: `Dear John,

I hope you're doing well. During our recent conversation, we talked about connecting you with some of our collaborators and team members. Below, you'll find their contact information:

1. Sarah Johnson from the Sales Department: 555-234-5678
2. Mike Brown from the IT Department: 1-555-876-5432
3. Widget Corp representative, Emily: 555-321-6543

We also mentioned a talented freelance copywriter named Lisa:

- Lisa's portfolio website: www.lisacopywriting.com
- Lisa's phone number: 555-567-1234

Please don't hesitate to reach out to them as needed. Thank you.

Warm regards,

Samantha
`,
      output: `-  Sarah Johnson from the Sales Department: "555-234-5678"
-  Mike Brown from the IT Department: "1-555-876-5432"
-  Widget Corp representative, Emily: "555-321-6543"
-  Lisa's phone number: "555-567-1234"`,
    },
  },
  {
    id: "extract-links",
    title: "Extract Links",
    prompt:
      "Extract links in the text. Do not provide any commentary other than the list of Markdown links." +
      generateSelection("Text", "Links"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Link,
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: `Hey!

I found some cool Swift programming resources that I thought you might like. Check out these online courses and tutorials:

- Codecademy Learn Swift: https://www.codecademy.com/learn/learn-swift
- Apple's Swift Programming Language Guide: https://docs.swift.org/swift-book/
- Ray Wenderlich Swift Tutorials: https://www.raywenderlich.com/ios/learn

Oh, and don't forget to take a look at the official Swift documentation:

- Swift Documentation: https://swift.org/documentation/

Hope you find these helpful! Let me know if you have any questions or need help with anything.

Take care,
Alice`,
      output: `- [Codecademy Learn Swift](https://www.codecademy.com/learn/learn-swift)
- [Apple's Swift Programming Language Guide](https://docs.swift.org/swift-book/)
- [Ray Wenderlich Swift Tutorials](https://www.raywenderlich.com/ios/learn)
- [Swift Documentation](https://swift.org/documentation/)`,
    },
  },
  {
    id: "pros-and-cons",
    title: "Pros & Cons",
    date: "2023-06-06",
    prompt:
      "List pros and cons for the text based on the topics mentioned. Format the response as a markdown list of pros and cons. Do not provide any other commentary." +
      generateSelection("Text", "Pros & Cons"),
    creativity: "medium",
    type: "text",
    icon: Icon.BulletPoints,
    author: {
      name: "Stephen Kaplan",
      link: "https://github.com/SKaplanOfficial",
    },
    example: {
      selection: "Rise of AI",
      output: `- Pros:
  - Increased efficiency
  - Improved accuracy
  - Automation of mundane tasks
- Cons:
  - Loss of jobs
  - Potential security risks
  - Unintended consequences of AI decisions`,
    },
  },
  {
    id: "eli",
    title: "Explain Like I'm a…",
    prompt:
      `Explain the text like I’m a {argument name=identity default="5 year old"}` +
      generateSelection("Text", "Explanation"),
    creativity: "low",
    date: "2023-06-06",
    type: "text",
    icon: Icon.Book,
    example: {
      argument: "5 year old",
      selection: `Time dilation is a difference in the elapsed time measured by two observers, due to the relative motion between them as described by the theory of relativity. In special relativity, time dilation occurs due to the relative motion between the observers, while in general relativity, it occurs due to the presence of a gravitational field.`,
      output: `Time dilation means that two people can experience time differently. It's like if one person is running really fast and the other person is walking, the person running will get to the end faster. The theory of relativity explains why this happens.`,
    },
  },
  {
    id: "text-analysis",
    title: "Text Analysis",
    prompt:
      "Analyze the text and provide insights on its tone, style, and potential audience." +
      generateSelection("Text", "Analysis"),
    creativity: "medium",
    date: "2023-06-06",
    type: "text",
    icon: Icon.MagnifyingGlass,
    example: {
      selection:
        "In the fast-paced world of technology, staying ahead of the curve is crucial for businesses. Implementing innovative strategies and leveraging cutting-edge tools can mean the difference between success and failure. As companies compete to outperform one another, it's important to invest in the right resources to stay relevant and maintain a competitive edge.",
      output: `This text has a professional and informative tone, and is likely aimed at business owners or executives. It emphasizes the importance of staying ahead of the competition by investing in innovative strategies and tools. The style is direct and clear, and the message is clear: invest in the right resources to stay competitive.`,
    },
  },
  {
    id: "summarize-product-reviews",
    title: "Summarize Product Reviews",
    prompt:
      `Carefully read the product reviews below. Translate them to English and create a summary of all the reviews in English and list them as Pros and Cons in the bullet point format. Remember that each bullet point should be one sentence or at max two short sentences. Most frequently mentioned should come first in each list and every bullet point should have a percentage showing how much evidence the reviews have brought for that pro or con. For example if reviews are mentioning that product is going bad easily and they brought some reasons for what they are saying, the percentage of your confidence should go higher, but if there are some reviews which are unsure about something or there are no evidence or it's not repeated frequently then the percentage should go lower. At the end you should write a paragraph about what I should pay attention to, before buying this product. These can be some warnings or some tips or some suggestions, points that I will miss, or anything that you think is important to know before buying this product.

You can use the following template to create the summary:

'''
## Summary of the reviews
**✅ Pros:**
- Pro 1 - percentage of your confidence%
- Pro 2 - percentage of your confidence%
...
- Pro n - percentage of your confidence%

**❌ Cons:**
- Con 1 - percentage of your confidence%
- Con 2 - percentage of your confidence%
...
- Con n - percentage of your confidence%

**💡 You should pay attention to:**
- Tip 1
- Tip 2
...
- Tip n
'''` + generateSelection("Product reviews", "Summary"),
    creativity: "low",
    date: "2023-06-16",
    icon: Icon.Tag,
    type: "text",
    author: {
      name: "Alireza Sheikholmolouki",
      link: "https://github.com/Alireza29675",
    },
    example: {
      selection: "{list of amazon reviews}",
      output: `## Summary of the reviews
**✅ Pros:**
-  Quick charge connection - 90%
-  Protective cover - 80%
-  Charges several devices at once - 80%
-  Charges my phone 8 times - 80%
-  Charges my two phones over 6 times - 80%
-  Charges my S20FE for 1 week - 80%
-  Long life battery - 80%

**❌ Cons:**
-  Very bulky - 90%
-  Heavy - 80%
-  Takes a while to fully charge itself - 70%

**💡 You should pay attention to:**
-  The size and weight of the product before purchasing, as it is quite bulky and heavy.
-  The charging time of the product, as it takes a while to fully charge itself.`,
    },
  },
];

type Category = {
  name: string;
  id: string;
  prompts: Prompt[];
  icon: Icon;
};

export const categories: Category[] = [
  {
    name: "Code",
    id: "code",
    prompts: [...code],
    icon: Icon.Code,
  },
  {
    name: "Communication",
    id: "communication",
    prompts: [...communication],
    icon: Icon.Envelope,
  },
  {
    name: "Image",
    id: "image",
    prompts: [...image],
    icon: Icon.Image,
  },
  {
    name: "Writing",
    id: "writing",
    prompts: [...writing],
    icon: Icon.Pencil,
  },
  {
    name: "Music",
    id: "music",
    prompts: [...music],
    icon: Icon.Music,
  },
  {
    name: "Ideas",
    id: "ideas",
    prompts: [...ideas],
    icon: Icon.LightBulb,
  },
  {
    name: "Fun",
    id: "fun",
    prompts: [...fun],
    icon: Icon.GameController,
  },
  {
    name: "Misc",
    id: "misc",
    prompts: [...misc],
    icon: Icon.Folder,
  },
];
