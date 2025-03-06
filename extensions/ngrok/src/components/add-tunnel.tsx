import { useState } from "react";
import {
  Icon,
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
  openCommandPreferences,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import { validateTag, validatePort, validateCloudEdgeLabels } from "../utils";
import { createTunnel, checkIsNgrokReady, connectNgrok, ReservedDomain } from "../api";

interface FormValues {
  port: string;
  tag?: string;
  domain?: string;
  cloudEdgeLabels?: string;
}

type Props = {
  revalidate: () => void;
  domains: ReservedDomain[];
};

export default function AddTunnel({ revalidate, domains }: Props) {
  const { pop } = useNavigation();

  const [isCloudEdge, setIsCloudEdge] = useState(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Connecting ngrok service...`,
      });

      try {
        const isReady = await checkIsNgrokReady();
        if (!isReady) {
          toast.title = `Starting ngrok service...`;
          await connectNgrok();
          toast.title = `Connecting Tunnel to Port ${values.port}...`;
        }

        const tunnel = await createTunnel(Number(values.port), values.domain, values.tag, values.cloudEdgeLabels);

        await Clipboard.copy(tunnel);

        toast.style = Toast.Style.Success;
        toast.title = `Tunnel created!`;
        toast.message = "URL copied to clipboard.";

        revalidate();

        pop();
      } catch (err) {
        console.error(err);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create tunnel";
        if (err instanceof Error) {
          toast.message = err.message;
        }
      }
    },
    validation: {
      port: validatePort,
      tag: validateTag,
      cloudEdgeLabels: isCloudEdge ? validateCloudEdgeLabels : undefined,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tunnel" icon={Icon.Plus} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Dashboard" url="https://dashboard.ngrok.com/" />
          <Action title="Change API Key" icon={Icon.Key} onAction={() => openCommandPreferences()} />
        </ActionPanel>
      }
      searchBarAccessory={<Form.LinkAccessory target="https://ngrok.com/docs/agent" text="Open Documentation" />}
    >
      <Form.Description text="Create a ngrok tunnel" />
      <Form.TextField title="Port" placeholder="Enter the localhost port to expose" {...itemProps.port} />
      <Form.TextField
        title="Tag"
        placeholder="(optional) Enter a nickname for this tunnel"
        info="Adds a nickname for the tunnel as metadata."
        {...itemProps.tag}
      />

      <Form.Checkbox
        id="answer"
        label="Use Cloud Edge?"
        info=""
        value={isCloudEdge}
        onChange={setIsCloudEdge}
        storeValue
      />

      {!isCloudEdge && (
        <Form.Dropdown title="Domain" {...itemProps.domain}>
          <Form.Dropdown.Item value="" title="No domain" />
          {domains.length > 0 && (
            <Form.Dropdown.Section title="Reserved domains">
              {domains.map((domain) => (
                <Form.Dropdown.Item key={domain.id} value={domain.domain} title={domain.domain} />
              ))}
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}

      {isCloudEdge && (
        <>
          <Form.TextField
            title="Labels"
            placeholder="env=prod,team=infra"
            info="A list of labels (name=value) that can be used to identify a tunnel to an ngrok Edge (specifically a tunnel group backend)."
            {...itemProps.cloudEdgeLabels}
          />
        </>
      )}
      <Form.Separator />
    </Form>
  );
}
