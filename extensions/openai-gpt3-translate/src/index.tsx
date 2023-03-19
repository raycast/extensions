import { useState, useEffect } from 'react';
import { Form, ActionPanel, Action, showToast, LocalStorage, Toast } from '@raycast/api';
import fetch from 'node-fetch';
import React from 'react';


type Values = {
  textarea: string;
};

type Message = {
  role: string;
  content: string;
};

type ChatRequest = {
  model: string;
  messages: Message[];
  stream: false;
};


type ChatCompletion = {
  id: string;
  object: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type ModelResponse = {
  error:{
    code: string
  } 
};


const model: string = 'gpt-3.5-turbo';
// gpt-3.5-turbo
const domain: string = 'https://api.openai.com';
const chatUrl: string = domain + '/v1/chat/completions';
const modelUrl: string = domain + '/v1/models';



function toastContent(title: string, content: string) {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: title,
    message: content,
    primaryAction: {
      title: "Do something",
      onAction: (toast) => {
        toast.hide();
      },
    },
  };
  showToast(options)
}



function createChatRequest(content: string): ChatRequest {
  const realString = "翻译以下内容：\n" + content;
  const message: Message = {
    role: 'user',
    content: realString,
  };
  const chatRequest: ChatRequest = {
    model: model,
    messages: [message],
    stream: false,
  };
  return chatRequest;
}

async function sendRequest(content: string): Promise<string> {
  const apiKey = await LocalStorage.getItem<string>('api-key');
  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey || '',
    },
    body: JSON.stringify(createChatRequest(content)),
  });

  const responseBody = await response.text();
  const chatCompletion: ChatCompletion = JSON.parse(responseBody) as ChatCompletion;
  return chatCompletion.choices[0].message.content;
}



async function listModel(apiKey: string): Promise<boolean> {
  const response = await fetch(modelUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey || '',
    },
  });

  const responseText = await response.text();
  const modelResponse = JSON.parse(await responseText) as ModelResponse;
  const errorCode = modelResponse?.error?.code; // access the 'code' field of the 'error' object
  return (errorCode != 'invalid_api_key');
}


function ConfigPage() {

  async function handleSubmit(values: { textfield: string }) {
    const isValid = await listModel(values.textfield);
    if (isValid) {
      LocalStorage.setItem('api-key', values.textfield);
    } else {
      toastContent("Failed", "invalid api-key");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="textfield" title="Api-Key" placeholder="Enter your Api-Key" />
    </Form>
  );
}

function UsePage() {
  const [output, setOutput] = React.useState<string>('');

  async function handleSubmit(values: Values) {
    const res = await sendRequest(values.textarea);
    setOutput(res);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="textarea" title="Input" placeholder="Enter multi-line text" />
      <Form.TextArea id="targetarea" title="Output" value={output} onChange={setOutput} placeholder="Enter multi-line text" />
      <Form.Separator />
      <Form.Dropdown id="dropdown" title="Dropdown">
        <Form.Dropdown.Item value="zh-en" title="中->英" />
        <Form.Dropdown.Item value="en-zh" title="英->中" />
      </Form.Dropdown>
    </Form>
  );
}

function RefreshPage() {
  const [apiKeyChecked, setApiKeyChecked] = useState<boolean>(false);

  useEffect(() => {
    async function checkApiKey() {
      const storedApiKey = await LocalStorage.getItem<string>('api-key');
      if (storedApiKey) {
        setApiKeyChecked(true);
      }
    }
    checkApiKey();
  }, []);

  if (!apiKeyChecked) {
    return <ConfigPage />;
  }
  return <UsePage />;
}

export default function Command() {
  return <RefreshPage />;
}
