import {
  ActionPanel,
  Icon,
  List,
  Action,
  Form,
  Keyboard,
  useNavigation,
  Alert,
  Color,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { parseResponse, useGetLinks } from "./hooks";
import { getFavicon, showFailureToast, useFetch, useForm } from "@raycast/utils";
import { useState } from "react";
import { API_HEADERS, API_URL } from "./config";
import { BrandedLink } from "./interfaces";
import fetch from "node-fetch";

export default function Rebrandly() {
  const [filter, setFilter] = useState("");
  const { isLoading, data: links, pagination, revalidate, mutate } = useGetLinks();
  const filteredLinks = !filter
    ? links
    : links.filter((link) => {
        if (filter === "starred") return link.favourite;
        if (filter === "notStarred") return !link.favourite;
        return link;
      });

  async function confirmAndDelete(link: BrandedLink) {
    const options: Alert.Options = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `Delete '${link.title}'?`,
      message: link.shortUrl,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting link", link.title);
      try {
        await mutate(
          fetch(API_URL + `links/${link.id}`, {
            method: "DELETE",
            headers: API_HEADERS,
          }).then((res) => parseResponse(res)),
          {
            optimisticUpdate(data) {
              return data.filter((l) => l.id !== link.id);
            },
            shouldRevalidateAfter: false,
          }
        );
        toast.style = Toast.Style.Success;
        toast.title = "Deleted link";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${error}`;
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by title or slashtag"
      throttle
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.Link} title="All" value="" />
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Star} title="Starred" value="starred" />
            <List.Dropdown.Item icon={Icon.StarDisabled} title="Not Starred" value="notStarred" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`${links.length} Links`}>
        {filteredLinks.map((link) => {
          const icon = getFavicon(link.destination, { fallback: Icon.Globe });
          const url = `${link.https ? "https" : "http"}://${link.shortUrl}`;
          return (
            <List.Item
              key={link.id}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser icon={icon} url={url} />
                  <Action.CopyToClipboard content={url} />
                  <Action.Push
                    icon={Icon.Plus}
                    title="Create New Link"
                    target={<CreateNewLink onCreate={revalidate} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Link"
                    onAction={() => confirmAndDelete(link)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
              icon={icon}
              id={link.id}
              keywords={[link.shortUrl, link.slashtag]}
              title={link.title.length > 48 ? `${link.title.substr(0, 48)}...` : link.title}
              subtitle={link.shortUrl}
              accessories={[
                link.favourite ? { icon: Icon.Star } : {},
                { text: `${link.clicks} clicks` },
                { date: new Date(link.createdAt), tooltip: link.createdAt },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CreateNewLink({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  interface FormValues {
    destination: string;
    slashtag: string;
    title: string;
  }
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      destination(value) {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch (error) {
          return "Must be a valid URL";
        }
      },
    },
  });
  const { isLoading } = useFetch(API_URL + "links", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(values),
    execute,
    parseResponse,
    onData() {
      onCreate();
      pop();
    },
    async onError(error) {
      await showFailureToast(error);
      setExecute(false);
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="New Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Destination URL"
        placeholder="Type or paste a link (URL)"
        info="Destination URL is the long link you want to shorten and rebrand"
        {...itemProps.destination}
      />
      <Form.Separator />
      <Form.Description text="OPTIONAL" />
      <Form.TextField
        title="Signature slug"
        placeholder="Signature slug (eg. card)"
        info="The keyword portion of your branded short link. A random one (as short as possible according to the branded domain you use) will be auto-generated if you do not specify one"
        {...itemProps.slashtag}
      />
      <Form.TextField
        title="Link title"
        placeholder="A random title will be assigned"
        info="A title you assign to the branded short link in order to remember what's behind it."
        {...itemProps.title}
      />
    </Form>
  );
}
