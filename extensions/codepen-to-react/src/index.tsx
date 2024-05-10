// @ts-nocheck
import { AI, List, BrowserExtension, Form, ActionPanel, Action, showToast, showHUD, Toast, Clipboard, Model, getPreferenceValues, environment, Detail } from "@raycast/api";
import { useAI, usePromise } from '@raycast/utils'
import { useEffect, useRef, useState } from "react";
import { parse } from 'dirty-json';
import { pick, isEmpty } from 'lodash'
import { join } from 'path'
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
// console.log('🔥 DIRTY JSON:', dJSON);


// type Model = typeof models[number];
type Prompt = {
  id: string;
  title: string;
  prompt: string;
  icon: IconName;
  creativity: "none" | "low" | "medium" | "high" | "maximum";
  model?: Model;
  date: `${number}-${number}-${number}`;
  author?: {
    name: string;
    link?: string;
  };
};

interface CodePenCodeResult {
  html: any;
  css: any;
  js: any;
  componentName: string;
  description: string;
}

async function getCodePenCode(): Promise<CodePenCodeResult> {
  let result: CodePenCodeResult = {
    html: {
      code: '',
      title: '',
      preprocessor: ''
    },
    css: {
      code: '',
      title: '',
      preprocessor: ''
    },
    js: {
      code: '',
      title: '',
      preprocessor: ''
    },
    componentName: "UntitledComponent",
    url: '',
    description: ''
  };

  try {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);

    if (activeTab) {
      const getContent = async (opts = {}) => {
        if (typeof opts === 'string') opts = { cssSelector: opts }
        const options = { tabId: activeTab.id, format: 'markdown', ...opts } as any
        console.log('OPTS:', options)
        const res = await BrowserExtension.getContent(options);
        return res
      }
      const format = 'markdown'
      const json = await getContent('#init-data')
      try {
        console.log(`🟥 FORMAT:`, format.toUpperCase());
        console.log(`🟩 CONTAINS __item at:`, test?.indexOf('__item'));
        console.log(`🟦 LENGTH:`, test?.length);
        // console.log(`🟪 ACTIVE TAB:`, activeTab);
        // console.log(`🟪 CONTENT:`, test);
        // Clipboard.copy(test)
        const data = parse(json)
        // const profile = parse(data?.__profile);
        const item = parse(data?.__item);
        const keys = ['html_pre_processor', 'css_pre_processor', 'js_pre_processor', 'title', 'html', 'css', 'js']
        console.log(`🌈 PARSED - dirty ITEM:`, pick(item, keys));
        // console.log(`🌈 PROFILE: `, profile);

        // Assign the extracted values to the result object
        result.html.code = item.html;
        result.html.preprocessor = item.html_pre_processor;
        result.html.title = item.html_pre_processor == 'none' ? 'HTML' : item.html_pre_processor?.toUpperCase()

        result.css.code = item.css;
        result.css.preprocessor = item.css_pre_processor;
        result.css.title = item.css_pre_processor == 'none' ? 'CSS' : item.css_pre_processor?.toUpperCase()

        result.js.code = item.js;
        result.js.preprocessor = item.js_pre_processor;
        result.js.title = item.js_pre_processor == 'none' ? 'JavaScript' : item.js_pre_processor?.toUpperCase()
        result.url = activeTab.url
        result.description = item.description
        result.componentName = toTitleCase(item.title);
      } catch (err) {
        console.error('Error:', err)
      }

      // const titleElement = await getContent('#editable-title-span')
      // result.componentName = formatComponentName(titleElement);
      // console.log('🔥 RESULT:', result.componentName)
      return result
    }
  } catch (error) {
    console.error("Error getting CodePen code:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error getting CodePen code",
      message: "Please make sure you have a CodePen tab active.",
    });
  }

  return result;
}

function toTitleCase(name: string): string {
  // Remove special characters and convert to TitleCase
  return name
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/\s+/g, "");
}

const models: Model = [
  "openai-gpt-3.5-turbo-instruct",
  "openai-gpt-3.5-turbo",
  "openai-gpt-4",
  "openai-gpt-4-turbo",
  "anthropic-claude-haiku",
  "anthropic-claude-opus",
  "anthropic-claude-sonnet",
  "perplexity-sonar-medium-online",
  "perplexity-sonar-small-online",
  "llama2-70b",
  "mixtral-8x7b",
  "codellama-70b-instruct"
] // as const;

function genPrompt({ html, css, js, componentName, url } = {}): string {
  return `IMPORTANT: DO NOT USE SEMICOLONS IN THE JAVASCRIPT/TYPESCRIPT CODE!

You are a highly skilled Principal software engineer with over 20 years of experience building modern web applications using React 18+.
You also have a deep understanding of canvas, animations, and performance optimization techniques.
Your task is to accurately convert the provided CodePen code into a fully functional, optimized React component using only React 18 or later syntax and conventions.
The CodePen may contain HTML, CSS, and JavaScript, and it may involve animations or HTML canvas elements.

Follow these steps to complete the conversion:
  1.  Carefully analyze the CodePen code to understand its structure, functionality, and any dependencies. Pay attention to any unique or complex aspects of the code.
  2.  Create a new React functional component and set up the necessary boilerplate code. Use arrow functions or function declarations for the component.
  3.  Convert the HTML structure into JSX within the component's return statement. Ensure that the JSX is semantically correct and follows React best practices.
  4.  Convert any inline styles or CSS classes into styled components using the @emotion/styled library. Create separate styled components for each element or group of elements with shared styles.
  5.  Convert any JavaScript code into the appropriate hooks, such as useState, useEffect, useRef. Make sure to handle state, side effects, and performance optimizations correctly.
  6.  If the CodePen involves animations, ensure they are properly implemented using React's hooks and libraries like CSS keyframes or Framer Motion. Optimize animations for performance and smooth transitions.
  7.  If the CodePen uses an HTML canvas, carefully integrate it into the React component using the useRef hook to access the canvas element and manage its rendering.
  8.  Review the converted code for any potential optimizations, such as memoization, or useMemo for expensive calculations. Ensure the component is efficient and avoids unnecessary re-renders.
  9.  Provide the complete React component code, along with any necessary import statements
  10. SSR is a requirement here so make sure the code does not error on the server.
  11. If their is any old JS code that uses "prototype" then convert that to a JS class.
  12. NEVER USE: do-while loops, React classes, semi-colons (unless it's for CSS rules), 
  13. If any styles are styling the <body/> or <html /> then localize them to the component. These styles should only affect this component, NOT OTHER ELEMENTS ON THE PAGE!
  14. The component requires BOTH an export and a export default
  15. code inside of the backticks in the styled components should use semicolons in the CSS

DO NOT USE SEMICOLONS IN THE JS/TS!
SHOW ALL THE CODE! YOUR RESPONSE WILL BE PASTED INTO A FILE TO EXECUTE!

DO NOT EXPLAIN THE CODE! JUST SHOW THE CODE!

Please convert the following CodePen code to a React component called ${componentName}:

${html?.title && html?.code && `
${html.title}:
\`\`\`${html.title?.toLowerCase()}
${html.code}
\`\`\`
`}

${css?.title && css?.code && `
${css.title}:
\`\`\`${css.title?.toLowerCase()}
${css.code}
\`\`\`
`}

${js?.title && js?.code && `
${js.title}:
\`\`\`${js.title?.toLowerCase()}
${js.code}
\`\`\`
`}

Please provide the converted React component code with a doc block between the imports and the rest of the code like this:
You will need to generate a "description" for the doc block based on the CodePen content.
// @ts-nocheck <- Add this line to the top of the file to disable TypeScript checking for the entire file.
// Paste your imports here...

/*
 * ${componentName}: ${url}
 * @description {{example: A background that simulates a black hole following the mouse cursor.}}
 * @todos
 * - [ ] animation props
 * - [ ] width and height props
 * - [ ] Add typescript types
 * - [ ] Add tests
 * - [ ] make sure it renders correctly in all browsers
 * - [ ] fix any SSR hydration issues
 */

// Paste your converted code here...

REMINDER: DO NOT USE SEMICOLONS IN THE JAVASCRIPT/TYPESCRIPT CODE!
`
}

const defaultPrompt: Prompt = {
  id: "",
  title: "",
  prompt: "",
  icon: "",
  creativity: 'low', // ["none", "low", "medium", "high", "maximum"],
  model: 'anthropic-claude-opus',
  date: "",
  author: {
    name: "",
    link: ""
  }
};

const useCodepen = () => {
  const { data, isLoading, error } = usePromise(getCodePenCode)
  const [all, setAll] = useState(data || {})
  const mounted = useRef(false)
  useEffect(() => {
    if (!isEmpty(data) && !mounted.current) {
      console.log('🔥 SETTING ALL:', data)
      setAll(data)
      mounted.current = true
    }
  }, [data])

  return { all, loadingCode: isLoading, error, ...all, setAll }
}

const useSettings = () => {
  const prefs = getPreferenceValues<Preferences>();
  const { projectPath, componentPath, saveAfterConvert, copyResponseToClipboard, gptModel } = prefs;
  const [settings, setSettings] = useState({
    model: gptModel?.value || defaultPrompt.model,
    saveAfterConvert,
    copyResponseToClipboard,
    projectPath,
    componentPath,
    creativity: defaultPrompt.creativity,
    path: join(projectPath, componentPath),
  });
  return { settings, ...settings, setSettings }
}

export default function Command() {
  // const [{ html, css, js, componentName }, setAll] = useState<CodePenCodeResult | null>({});
  const [isLoading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const { settings, model, creativity, setSettings } = useSettings()
  console.log('⚙️⚙️ SETTINGS', settings)
  const { all, loadingCode, error, html, css, js, componentName, description, setAll } = useCodepen()

  const onChange = (key) => (val) => {
    if (isLoading) return
    // console.log('🔥 CHANGE:', val)
    const atRoot = ['componentName', 'description'].includes(key)
    setAll(a => ({ ...a, [key]: !atRoot ? { ...a[key], code: val } : val }))
  }

  const convertToReact = async () => {
    try {
      showToast({
        style: Toast.Style.Success,
        title: 'Converting to React',
        message: 'Code is being converted to React...',
      });
      setLoading(true);
      setResult('');
      // await showHUD("Generating answer...");

      const prompt = genPrompt(all);
      console.log('🧠🧠🧠 CONVERT 🧠🧠🧠 - STARTING convertToReact -- ON: ', typeof window === 'undefined' ? '📡 SERVER' : '💻 BROWSER / CLIENT')
      Clipboard.copy(prompt)
      // const reactCode = await AI.ask(prompt, { model, creativity });

      // const reactCode = await createAIChat(prompt);
      // const stream = AI.ask(prompt);

      // stream.on('data', (chunk) => {
      //   console.log('🔥 CHUNK:', chunk)
      //   setResult((prevResult) => prevResult + chunk);
      // })

      // const reactCode = await stream
      const reactCode = await new Promise<string>((resolve, reject) => {
        let finalResult = '';
        AI.ask(prompt, { model, creativity })
          .on('data', (chunk) => {
            finalResult += chunk;
            setResult(finalResult);
          })
          .then(() => resolve(finalResult))
          .catch(reject);
      });
      // const [imports, reactCode] = answer.split('/* ---- */')

      console.log('😍😍😍 Converted React code:', reactCode);
      //         const code = `// @ts-nocheck
      // ${imports}

      // /**
      //  * ${componentName}: ${url}
      //  * @description A background that simulates a black hole following the mouse cursor.
      //  * @todos
      //  * - [ ] animation props
      //  * - [ ] width and height props
      //  * - [ ] Add typescript types
      //  * - [ ] Add tests
      //  * - [ ] make sure it renders correctly in all browsers
      //  * - [ ] fix any SSR hydration issues
      //  */

      // ${reactCode}
      //       `
      // Clipboard.copy(JSON.stringify(stream));
      // await stream.finished();

      // console.log('😍😍😍 Converted React code:', reactCode);
      if (settings.copyResponseToClipboard) {
        Clipboard.copy(reactCode);
      }

      // const filePath = join(projectPath,);
      if (settings.saveAfterConvert) {
        const fileName = `${componentName}.tsx`
        // const filePath = join(projectPath, componentPath, fileName);
        const filePath = join(settings.path, fileName);
        // console.log('📂 FILE PATH TO SAVE TO ', {
        //   projectPath: settings.projectPath,
        //   componentPath: settings.componentPath,
        //   componentName,
        //   fileName,
        //   filePath,
        //   homedir: homedir()
        // })
        await writeFile(filePath, reactCode);
        try {
          // Open the file in VS Code
          await execAsync(`code "${filePath}"`);
        } catch (error) {
          console.error('Error opening file in VS Code:', error);
          // Handle the error appropriately (e.g., show an error message to the user)
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: 'CodePen code converted to React',
        message: 'The code has been successfully converted to React.',
      });

      // You can further process the reactCode or display it in the UI
    } catch (error) {
      console.error('Error converting CodePen code to React:', error);
      showToast({
        style: Toast.Style.Failure,
        title: 'Error converting CodePen code to React',
        // message: 'An error occurred while converting the code to React.',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }
  // console.log('🔥 ALL:', {
  //   // ...all,
  //   // data
  //   // html,
  //   // css,
  //   // js,
  //   // componentName
  // })
  if (!html || !css || !js) return <Form><Form.Description text='Grabbing Code from Codepen...' /></Form>;
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert to React"
            onSubmit={async (values) => {
              console.log("Submitted values:", values);
              convertToReact();
              // showToast({
              //   style: Toast.Style.Success,
              //   title: "CodePen code submitted",
              //   message: "The code has been successfully submitted.",
              // });
            }}
          />
          <Action.SubmitForm
            title="Copy Prompt"
            onSubmit={async (values) => {
              console.log("Submitted values:", values);
              const prompt = genPrompt(all);
              Clipboard.copy(prompt);
              // convertToReact();
              await showHUD("Prompt copied to clipboard");
              // showToast({
              //   style: Toast.Style.Success,
              //   title: "CodePen Prompt copied to clipboard",
              //   message: "The Prompt has been successfully copied to the clipboard.",
              // });
            }}
          />
        </ActionPanel>
      }
    >
      {!result && !isLoading && (
        <>
          <Form.TextField id="componentName" title="Component Name" onChange={onChange('componentName')} value={componentName} />
          <Form.TextField id="description" title="Component Description" onChange={onChange('description')} value={description} />
          {html?.code && <Form.TextArea id="html" title={html.title} onChange={onChange('html')} value={html?.code} />}
          {css?.code && <Form.TextArea id="css" title={css.title} onChange={onChange('css')} value={css?.code} />}
          {js?.code && <Form.TextArea id="js" title={js.title} onChange={onChange('js')} value={js?.code} />}
          <Form.Dropdown id="creativity" title="Creativity" value={creativity} onChange={creativity => setSettings({ ...settings, creativity })}>
            {['none', 'low', 'medium', 'high', 'maximum'].map((c) => (
              <Form.Dropdown.Item value={c} title={c} key={c} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown id="gptModel" title="GPT Model" value={model} onChange={model => setSettings({ ...settings, model })}>
            {models.map((c) => (
              <Form.Dropdown.Item value={c} title={c} key={c} />
            ))}
          </Form.Dropdown>
        </>
      )}
      {isLoading && (
        <Form.Description text="Converting to React..." />
      )}
      {result && <Form.Description text={result} />}

      {/* <Form.TextArea id="prompt" title='Prompt' value={prompt} onChange={e => {
        return console.log('🔥 PROMPT:', e)
        setPrompt(e.target.value)
      }} /> */}
    </Form>
  );
}
