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
import { useExec, useForm } from "@raycast/utils";

import { validateLabel, validatePort } from "../utils/validators";
import { createTunnel, checkIsNgrokReady, connectNgrok, ReservedDomain } from "../api";

interface FormValues {
  port: string;
  label?: string;
  domain?: string;
}

type Props = {
  revalidate: () => void;
  domains: ReservedDomain[];
};

export default function AddTunnel({ revalidate, domains }: Props) {
  const { pop } = useNavigation();

  const { data: ngrokBin } = useExec("which", ["ngrok"]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (!ngrokBin) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Couldn't find ngrok CLI`,
        });
        return;
      }
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

        const tunnel = await createTunnel(Number(values.port), values.domain, values.label);

        await Clipboard.copy(tunnel);

        toast.style = Toast.Style.Success;
        toast.title = `Tunnel created on ${tunnel}!`;
        toast.message = "URL copied to clipboard.";

        revalidate();

        pop();
      } catch (err) {
        console.log(err);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create tunnel";
        if (err instanceof Error) {
          toast.message = err.message;
        }
      }
    },
    validation: {
      port: validatePort,
      label: validateLabel,
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
    >
      <Form.Description text="Create a ngrok tunnel" />
      <Form.TextField title="Port" placeholder="Enter the localhost port to expose" {...itemProps.port} />
      <Form.TextField title="Label" placeholder="(optional) Enter a label for this tunnel" {...itemProps.label} />
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
    </Form>
  );
}
