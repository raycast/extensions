import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStatus, getStatusFromOrgin, parseUrl } from "./lib/api";
import { addPageId, getPageIds } from "./lib/store";
import { Status } from "./lib/types";

export const popularServices = [
  "s2k7tnzlhrpw", // DigitalOcean
  "t34htyd6jblf", // Dropbox
  "kctbh9vrtdwd", // GitHub
  "srhpyqt94yxb", // Discord
  "2kbc0d48tv3j", // Reddit
  "1m1j8k4rtldg", // Intercom
  "1jkhm1drpysj", // Squarespace
  "gpkpyklzq55q", // Twilio
  "kr0djjh0jyy9", // Coinbase
  "yh6f0r4529hb", // Cloudflare
];

export default function AddServiceList({ refreshStatus }: { refreshStatus?: () => void }) {
  const [isLoading, setLoading] = useState(true);
  const [services, setServices] = useState<Status[]>([]);

  useEffect(() => {
    if (!services.length) fetchPopularData();
  }, []);

  async function fetchPopularData() {
    setLoading(true);

    const fetchStatusPages = await Promise.all(
      popularServices.map(
        (id) =>
          new Promise<Status | null>((res) => {
            getStatus(id)
              .then(res)
              .catch(() => {
                res(null);
              });
          })
      )
    );

    const pages = fetchStatusPages.filter((p): p is Status => !!p);

    setServices(pages);
    setLoading(false);
  }

  function AddServiceActionPanel({ service }: { service: Status }) {
    return (
      <ActionPanel>
        <Action title="Add Service" icon={Icon.Plus} onAction={() => addService(service, refreshStatus)} />
      </ActionPanel>
    );
  }

  function AddCustomServiceActionPanel() {
    return (
      <ActionPanel>
        <Action.Push
          title="Add Custom Service"
          icon={Icon.Plus}
          target={<AddCustomServiceForm refreshStatus={refreshStatus} />}
        />
      </ActionPanel>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a service to add" navigationTitle="Add Service">
      <List.Item
        title="Custom Service"
        subtitle="Add a status page by URL"
        icon={{ source: Icon.Plus }}
        actions={<AddCustomServiceActionPanel />}
      />
      {!isLoading && (
        <List.Section title="Popular Services">
          {services.map((service, index) => (
            <List.Item
              key={index}
              title={service.page.name}
              icon={`https://www.google.com/s2/favicons?domain=${service.page.url}&sz=64`}
              actions={<AddServiceActionPanel service={service} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export function AddCustomServiceForm({ refreshStatus }: { refreshStatus?: () => void }) {
  const [urlError, setUrlError] = useState<string | undefined>();

  function AddCustomServiceFormActionPanel() {
    return (
      <ActionPanel>
        <Action.SubmitForm title="Add Service" onSubmit={handleSubmit} />
      </ActionPanel>
    );
  }

  async function handleSubmit({ url }: { url: string }) {
    const parsedUrl = parseUrl(url);
    if (!parsedUrl)
      return showToast({
        title: "Invalid URL",
        message: "Be sure to include the protocol (http/https)",
        style: Toast.Style.Failure,
      });

    await showToast({ title: "Validating Service", style: Toast.Style.Animated });

    const fetchService = await getStatusFromOrgin(parsedUrl.origin).catch(() => null);
    if (!fetchService?.page?.id || !fetchService.page.name)
      return showToast({
        title: "Invalid Status Page",
        message: "The URL was not an Atlassian Statuspage.",
        style: Toast.Style.Failure,
      });

    addService(fetchService, refreshStatus);
  }

  function validateForm(url: string) {
    if (!parseUrl(url)) setUrlError("Please enter a valid URL");
    else setUrlError(undefined);
  }

  return (
    <Form navigationTitle="Add Custom Service" actions={<AddCustomServiceFormActionPanel />}>
      <Form.Description text="Enter the service's status page URL below! Keep in mind that this only supports Atlasisan Statuspage." />
      <Form.TextField
        id="url"
        title="Page URL"
        placeholder="https://githubstatus.com"
        info="The URL of the service's status page."
        error={urlError}
        onChange={validateForm}
        autoFocus
      />
    </Form>
  );
}

const addingList = new Set();
export async function addService(service: Status, refresh?: () => void) {
  if (addingList.has(service.page.id)) return;
  addingList.add(service.page.id);

  const toast = await showToast({ title: `Adding ${service.page.name}`, style: Toast.Style.Animated });

  const currentPages = await getPageIds();
  if (currentPages.includes(service.page.id)) {
    addingList.delete(service.page.id);
    toast.title = "Already Added";
    toast.message = "You've already added this service.";
    toast.style = Toast.Style.Failure;
    return;
  }

  await addPageId(service.page.id);
  if (refresh) refresh();

  addingList.delete(service.page.id);
  toast.title = `Added ${service.page.name}`;
  toast.style = Toast.Style.Success;
}
