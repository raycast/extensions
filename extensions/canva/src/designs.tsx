import { authorize, client } from "./oauth";
import { Action, ActionPanel, Form, Grid, Icon, Keyboard, useNavigation } from "@raycast/api";
import { useCachedState, useFetch, useForm } from "@raycast/utils";
import { useEffect } from "react";
import "cross-fetch/polyfill";

interface Design {
  id: string;
  title: string;
  owner: {
    user_id: string;
    team_id: string;
  }
  thumbnail: {
    width: number;
    height: number;
    url: string;
  }
  urls: {
    edit_url: string;
    view_url: string;
  }
  created_at: number;
  updated_at: number;
  page_count: number;
}

export default function Index() {
  const [token, setToken] = useCachedState<string | undefined>("token");
  useEffect(() => {
    (async () => {
      await authorize();
      const tokenSet = await client.getTokens();
      setToken(tokenSet?.accessToken);
    })()
  }, [])

  const { isLoading, data, revalidate } = useFetch("https://api.canva.com/rest/v1/designs", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    execute: !!token,
    initialData: [],
    mapResult(result: { items: Design[] }) {
      return {
        data: result.items
      }
    },
  })
  
  return <Grid isLoading={isLoading}>
    {data.map(design => <Grid.Item key={design.id} content={design.thumbnail?.url} title={design.title || ""} actions={<ActionPanel>
      <Action.OpenInBrowser icon={Icon.Eye} title="Open View URL" url={design.urls.view_url} />
      <Action.OpenInBrowser icon={Icon.Pencil} title="Open Edit URL" url={design.urls.view_url} />
      <Action.Push icon={Icon.Plus} title="Create Design" target={<CreateDesign onCreate={revalidate} />} shortcut={Keyboard.Shortcut.Common.New} />
    </ActionPanel>} />)}
  </Grid>
}

function CreateDesign({ onCreate }:{onCreate: ()=> void}) {
  const [token] = useCachedState<string>("token");
  interface FormValues {
    type: string;
    name: string;
    width: string;
    height: string;
    title: string;
  }
  const {pop} = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const { type, name, width, height, title } = values;
      const body: Partial<FormValues> = type==="preset" ? { type, name } : { type, width, height };
      if (title) body.title = title;
      
      const res = await fetch("https://api.canva.com/rest/v1/designs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(res.statusText);
      onCreate();
      pop();
    },
    validation: {
      height(value) {
        if (values.type==="custom") {
          if (!Number(value)) return "Must be a number";
          if (Number(value) < 40) return "Must be at least 40";
          if (Number(value) > 8000) return "Must not be more than 8000";
        }
      },
      width(value) {
        if (values.type==="custom") {
          if (!Number(value)) return "Must be a number";
          if (Number(value) < 40) return "Must be at least 40";
          if (Number(value) > 8000) return "Must not be more than 8000";
        }
      },
      title(value) {
        if (value && value.length > 255) return "Must be less than 256 chars";
      },
    }
  })
  return <Form isLoading={isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Plus} title="Create Design" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.Dropdown title="Type" {...itemProps.type}>
    <Form.Dropdown.Item title="Preset" value="preset" />
    <Form.Dropdown.Item title="Custom" value="custom" />
  </Form.Dropdown>
  {values.type==="preset" ? <Form.Dropdown title="Name" {...itemProps.name}>
    <Form.Dropdown.Item title="Doc" value="doc" />
    <Form.Dropdown.Item title="Whiteboard" value="whiteboard" />
    <Form.Dropdown.Item title="Presentation" value="presentation" />
  </Form.Dropdown> : <>
    <Form.TextField title="Height" placeholder="The width of the design, in pixels." {...itemProps.height} />
    <Form.TextField title="Width" placeholder="The width of the design, in pixels." {...itemProps.width} />
  </>}
  <Form.TextField title="Title" placeholder="The name of the design." {...itemProps.title} />
  </Form>
}