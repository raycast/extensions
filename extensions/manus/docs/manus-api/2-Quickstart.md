# Quickstart

> Generate an API key and make your first call.

## Create Your API Key

<Card title="Get your API Key" horizontal arrow icon="key" href="http://manus.im/app?show_settings=integrations&app_name=api">
  Navigate to the API Integration settings to generate a new key.
</Card>

<Warning>
  Keep your API keys secure and never share them publicly. Each key provides full access to your Manus account.
</Warning>

## Make Your First API Call

<Tabs>
  <Tab title="cURL">
    ```shell lines theme={null}
    curl --request POST \
      --url 'https://api.manus.ai/v1/tasks' \
      --header 'accept: application/json' \
      --header 'content-type: application/json' \
      --header "API_KEY: $MANUS_API_KEY" \
      --data '{
        "prompt": "hello"
      }'
    ```
  </Tab>

  <Tab title="Python">
    ```python lines theme={null}
    import requests

    url = "https://api.manus.ai/v1/tasks"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "API_KEY": f"{MANUS_API_KEY}"
    }
    data = {
        "prompt": "hello"
    }

    response = requests.post(url, json=data, headers=headers)
    print(response.json())
    ```

  </Tab>

  <Tab title="TypeScript">
    ```typescript lines theme={null}
    const response = await fetch('https://api.manus.ai/v1/tasks', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'API_KEY': `${process.env.MANUS_API_KEY}`
      },
      body: JSON.stringify({
        prompt: 'hello'
      })
    });

    const data = await response.json();
    console.log(data);
    ```

  </Tab>
</Tabs>

## Next Steps

Now that you've made your first API call, here are a few things you can do to learn more about the Manus API:

<Card title="Switch from OpenAI in 3 lines of code" horizontal icon="rocket" href="/openai-compatibility/index">
  Learn more about our Responses API, allowing you to switch from OpenAI to the Manus API with just 3 lines of code.
</Card>

<CardGroup>
  <Card title="API Reference" icon="code" href="/api-reference/create-task">
    View the complete API documentation with detailed endpoint specifications.
  </Card>

  <Card title="Webhooks" icon="bell" href="/webhooks/introduction">
    Get real-time notifications for task lifecycle events.
  </Card>
</CardGroup>

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
