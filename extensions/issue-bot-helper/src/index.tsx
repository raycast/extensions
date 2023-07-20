import { Form, ActionPanel, Action, LaunchProps, popToRoot, closeMainWindow, Cache, getPreferenceValues, Detail, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fetch from "node-fetch";

interface Values {
  summary: string;
  parent: string;
  isStory: boolean;
  component: string
  labels: string[];
}

function getChannelItems()  {
  // TODO: 캐시로 최근 사용 순으로 보여주기
  // TODO: 설정에서 가져오기
  // TODO: 토큰으로 검색하기
  return [
    {
      'title': '#한은이-메모장',
      'value': 'C02QCE6D1EV'
    }
    // {
    //   'title': '#team-internal-platform-dev',
    //   'value': 'C01869D4230'
    // },
    // {
    //   'title': '#tribe-internal-builder-dev',
    //   'value': 'C046Q2QC4HH'
    // }
  ]
}

function getComponentItems()  {
  return [
    {
      'title': '인터널 빌더',
      'value': '인터널 빌더'
    },
    {
      'title': '계정권한',
      'value': '계정권한'
    },
  ]
}


export default function Command(props: LaunchProps<{arguments: Arguments.Index}>) {
  const {token, slackId} = getPreferenceValues();

  const channleItems = getChannelItems();
  const componentItems = getComponentItems();

  const [summary, setSummary] = useState(props.arguments.summary);
  const [channel, setChannel] = useState<string>(channleItems[0].value);
  const [parent, setParent] = useState<string | undefined>();
  const [isStory, setIsStory] = useState<boolean>(false);
  const [component, setComponent] = useState<string | undefined>();

  const message = useMemo(() => {
    let result = `!이슈등록 ${summary}`;
    if (parent) {
      result += ` /parent:"${parent}"`;
    }
    if (isStory) {
      result += ` /type:"Story"`;
    }
    if (component) {
      result += ` /component:"${component}"`;
    }

    return result;
  }, [summary, parent, isStory, component])
  
  async function sendWithToast() {
    const toast = await showToast({
      title: message,
      style: Toast.Style.Animated
    })
    
    send(message).then(() => {
      toast.hide();
      closeMainWindow();
      showToast({
        title: message,
        style: Toast.Style.Success,
      })
    }).catch(() => {
      toast.hide();
      closeMainWindow();
      showToast({
        title: message,
        style: Toast.Style.Failure,
      })
    }).finally(() => {
      popToRoot();
    })
  }

  if(props.arguments.summary) {
    sendWithToast();
    return <></>
  }

  async function send(text: string) {
    if (!channel || !token) {
      throw Error(`channel 또는 token이 없음 channel=${channel},token=${token}`)
    } 
    await fetch('https://tossteam.slack.com/api/chat.postMessage', {
      method: "post",
      body: JSON.stringify({channel, text}),
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    })
    console.log(`send ${text} ${channel} ${token}`)
  }

  async function handleSubmit(values: Values) {
    await send(message);
    showHUD(message)
    popToRoot();
    closeMainWindow();
  }

  async function handleSubmit2(values: Values) {
    await send(`${message} <@${slackId}>`)
    showHUD(`${message} <@${slackId}>`)
    popToRoot();
    closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="전송하기" onSubmit={handleSubmit} />
          <Action.SubmitForm title="'나에게 할당' 전송하기" onSubmit={handleSubmit2}/>
        </ActionPanel>
      }
    >
      <Form.Description text={message} />
      <Form.TextArea id="summary" title="Summary" placeholder="Enter text" value={summary} onChange={setSummary}/>
      <Form.Separator />
      <Form.Checkbox id="type" title="Story" label="스토리 타입이면 체크" value={isStory} onChange={setIsStory} storeValue/>
      {!isStory && <Form.TextField id="parent" title="Parent" placeholder="IP-0000" value={parent} onChange={setParent} />}
      <Form.Dropdown id="channel" title="Channel" value={channel} onChange={setChannel}>
        {channleItems.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="component" title="Component" value={component} onChange={setComponent} storeValue>
      <Form.Dropdown.Item value="" title="없음" />
      <Form.Dropdown.Section />
        {componentItems.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
