import { Action, ActionPanel, Form, Icon, LaunchProps, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { searchOnDevice } from "./lib/actions";
import { describeRokuError } from "./lib/roku";
import type { RokuDevice } from "./lib/types";
import { DeviceSetup } from "./components/DeviceSetup";
import { useDevices } from "./components/useDevices";

type Values = { keyword: string; autoplay: boolean };

export default function SearchRokuCommand(props: LaunchProps<{ arguments: Arguments.SearchRoku }>) {
  const saved = useDevices();
  const query = props.arguments.query?.trim();
  const ran = useRef(false);

  useEffect(() => {
    if (!query || !saved.device || ran.current) return;
    ran.current = true;
    const device = saved.device;
    searchOnDevice(device, query)
      .then(() => showHUD(`Searching “${query}” on ${device.name}`))
      .then(() => closeMainWindow())
      .catch((cause) => showFailureToast(describeRokuError(cause), { title: "Search failed" }));
  }, [query, saved.device?.id]);

  if (!saved.device) return <DeviceSetup {...saved} />;
  return <SearchRokuForm device={saved.device} initialKeyword={query} />;
}

export function SearchRokuForm({
  device,
  initialKeyword,
  navigationTitle,
}: {
  device: RokuDevice;
  initialKeyword?: string;
  /** Only set when pushed; the command root keeps Raycast's title. */
  navigationTitle?: string;
}) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: Values) {
    if (!values.keyword.trim()) {
      setError("Enter a movie, show, or person.");
      return;
    }
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Searching on TV…", message: device.name });
    try {
      await searchOnDevice(device, values.keyword, { launch: values.autoplay });
      toast.style = Toast.Style.Success;
      toast.title = values.autoplay ? "Opening best match" : "Search results are on your TV";
      toast.message = values.keyword;
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Search failed";
      toast.message = describeRokuError(cause);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search on TV" icon={Icon.MagnifyingGlass} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keyword"
        title="Search"
        placeholder="Movie, show, actor or director"
        defaultValue={initialKeyword}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Checkbox
        id="autoplay"
        label="Open the best match directly"
        defaultValue={false}
        info="Roku picks the top result and launches it in a provider you have installed. Not every title supports this."
      />
      <Form.Description text="Uses Roku's universal search, which looks across all your installed streaming channels." />
    </Form>
  );
}
