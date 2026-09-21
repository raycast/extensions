import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { useToken } from "./instances";
import { useComposeContainers } from "./compose-containers";
import { Domain, ErrorResult } from "./interfaces";

// Only applications and compose stacks can have a domain; the five database kinds cannot.
type DomainableKind = "application" | "compose";
const ENDPOINTS: Record<DomainableKind, string> = {
  application: "domain.byApplicationId",
  compose: "domain.byComposeId",
};
const ID_FIELDS: Record<DomainableKind, string> = {
  application: "applicationId",
  compose: "composeId",
};

export function domainUrl(domain: Domain): string {
  const path = domain.path && domain.path !== "/" ? domain.path : "";
  return `${domain.https ? "https" : "http"}://${domain.host}${path}`;
}

/** The domains pointing at one service. */
export default function ServiceDomains({
  service,
}: {
  service: { id: string; type: DomainableKind; name: string; appName?: string };
}) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: domains,
    error,
    revalidate,
  } = useFetch<Domain[], Domain[]>(`${url}${ENDPOINTS[service.type]}?${ID_FIELDS[service.type]}=${service.id}`, {
    headers,
    initialData: [],
  });

  async function deleteDomain(domain: Domain) {
    // Applications get their Traefik config updated right away. Compose domains are Docker labels
    // instead, so the container keeps answering on this domain until the stack is redeployed - the
    // record disappears here immediately, but the routing doesn't.
    const isCompose = service.type === "compose";

    const options: Alert.Options = {
      title: `Delete ${domain.host}?`,
      message: isCompose
        ? "Compose domains are Docker labels - the service keeps answering on this domain until the stack is redeployed."
        : "The service stops answering on this domain. Nothing else about it changes.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Domain",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, `Deleting ${domain.host}…`);
    try {
      const response = await fetch(url + "domain.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ domainId: domain.domainId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${domain.host}`;
      if (isCompose) toast.message = "Redeploy the compose to apply the change.";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete domain";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${service.name} - Domains`}>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not load domains" description={`${error}`} />
      ) : domains.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Domains"
          description={`${service.name} is not reachable on any domain yet.`}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Domain"
                target={<AddDomainForm service={service} onCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        domains.map((domain) => (
          <List.Item
            key={domain.domainId}
            icon={{
              source: Icon.Globe,
              tintColor: domain.enabled !== false && domain.https ? Color.Green : Color.SecondaryText,
              tooltip: domain.enabled === false ? "Domain is disabled and not routed." : undefined,
            }}
            title={domain.host}
            subtitle={domain.path && domain.path !== "/" ? domain.path : undefined}
            accessories={[
              // The container the domain resolves to is the thing worth checking on a compose stack,
              // where getting it wrong is what makes a domain quietly serve nothing.
              ...(domain.serviceName ? [{ tag: domain.serviceName, icon: Icon.Box }] : []),
              ...(domain.port
                ? [
                    {
                      text: String(domain.port),
                      tooltip: "The container's own port - not necessarily one reachable from outside directly.",
                    },
                  ]
                : []),
              domain.enabled === false
                ? {
                    tag: { value: "Disabled", color: Color.SecondaryText },
                    tooltip: "Domain is disabled and not routed.",
                  }
                : {
                    tag: domain.https ? { value: "HTTPS", color: Color.Green } : { value: "HTTP", color: Color.Orange },
                  },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Domain" url={domainUrl(domain)} />
                <Action.CopyToClipboard title="Copy URL" content={domainUrl(domain)} />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Domain"
                  target={<AddDomainForm service={service} onCreated={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Domain"
                  style={Action.Style.Destructive}
                  onAction={() => deleteDomain(domain)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const CERTIFICATE_TYPES = [
  { value: "letsencrypt", title: "Let's Encrypt" },
  { value: "none", title: "None" },
  { value: "custom", title: "Custom" },
];

/** The `<kind>.one` fields this form needs - just enough to drive Generate/Check DNS. */
interface ServiceServerDetail {
  serverId?: string | null;
}

interface AddDomainFormValues {
  host: string;
  containerServiceName: string;
  path: string;
  port: string;
  https: boolean;
  certificateType: string;
  customCertResolver: string;
}

/**
 * Adding a domain needs two things the read-only domains list doesn't: a container to route to
 * (Compose only - an application has just the one), and a way to get a working host without the
 * user having to hand-configure DNS first. `Generate Domain` covers the latter for servers with a
 * public IP; `Check DNS` is an advisory step for everyone else, since Dokploy itself doesn't block
 * saving a domain whose DNS isn't right yet - only Let's Encrypt issuance later does.
 */
function AddDomainForm({
  service,
  onCreated,
}: {
  service: { id: string; type: DomainableKind; name: string; appName?: string };
  onCreated: () => void;
}) {
  const { url, headers } = useToken();
  const { pop } = useNavigation();
  const [isBusy, setIsBusy] = useState(false);
  const isCompose = service.type === "compose";

  const { containers, containersLoading, containersError, retryContainers } = useComposeContainers(
    url,
    headers,
    service.id,
    isCompose,
  );

  const { data: serverDetail } = useFetch<ServiceServerDetail, ServiceServerDetail | undefined>(
    `${url}${service.type}.one?${ID_FIELDS[service.type]}=${service.id}`,
    { headers },
  );
  const serverId = serverDetail?.serverId;

  const { handleSubmit, itemProps, values, setValue } = useForm<AddDomainFormValues>({
    async onSubmit(formValues) {
      const toast = await showToast(Toast.Style.Animated, `Adding ${formValues.host}…`);
      try {
        const trimmedPath = formValues.path.trim();
        const body: Record<string, unknown> = {
          host: formValues.host.trim(),
          path: trimmedPath && trimmedPath !== "/" ? trimmedPath : null,
          // Omitted, not null - Dokploy only applies its own 3000 default when the field is
          // missing entirely; a null port makes Traefik fall back to 80 instead.
          port: formValues.port.trim() ? Number(formValues.port) : undefined,
          https: formValues.https,
          certificateType: formValues.https ? formValues.certificateType : undefined,
          customCertResolver:
            formValues.https && formValues.certificateType === "custom"
              ? formValues.customCertResolver.trim()
              : undefined,
          domainType: service.type,
          ...(isCompose
            ? { composeId: service.id, serviceName: formValues.containerServiceName }
            : { applicationId: service.id }),
        };

        const response = await fetch(url + "domain.create", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Added domain";
        if (isCompose) toast.message = "Redeploy the compose to apply the change.";
        onCreated();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not add domain";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      host: "",
      containerServiceName: "",
      path: "/",
      port: "",
      https: true,
      certificateType: "letsencrypt",
      customCertResolver: "",
    },
    validation: {
      host: FormValidation.Required,
      containerServiceName: (value) => {
        if (isCompose && !value) return "Select a container";
      },
      port: (value) => {
        if (!value) return;
        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) return "Enter a port between 1 and 65535";
      },
      customCertResolver: (value) => {
        if (values.https && values.certificateType === "custom" && !value?.trim()) {
          return "Enter the Traefik certificate resolver to use";
        }
      },
    },
  });

  async function generateDomain() {
    if (!serverId) return;
    setIsBusy(true);
    const toast = await showToast(Toast.Style.Animated, "Checking eligibility…");
    try {
      const eligibleResponse = await fetch(`${url}domain.canGenerateTraefikMeDomains?serverId=${serverId}`, {
        headers,
      });
      if (!eligibleResponse.ok) {
        const err = (await eligibleResponse.json()) as ErrorResult;
        throw new Error(err.message);
      }
      const eligible = (await eligibleResponse.json()) as boolean;
      if (!eligible) {
        toast.style = Toast.Style.Failure;
        toast.title = "Can't generate a domain";
        toast.message = "This server doesn't have a public IP address.";
        return;
      }

      toast.title = "Generating domain…";
      const response = await fetch(`${url}domain.generateDomain`, {
        method: "POST",
        headers,
        body: JSON.stringify({ appName: service.appName ?? service.name, serverId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      const result = (await response.json()) as unknown;
      const generatedHost =
        typeof result === "string"
          ? result
          : ((result as { domain?: string; host?: string })?.domain ??
            (result as { domain?: string; host?: string })?.host);
      if (!generatedHost) throw new Error("Dokploy did not return a domain.");

      setValue("host", generatedHost);
      toast.style = Toast.Style.Success;
      toast.title = "Generated domain";
      toast.message = generatedHost;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not generate domain";
      toast.message = `${error}`;
    } finally {
      setIsBusy(false);
    }
  }

  async function checkDns() {
    if (!values.host.trim()) {
      await showToast(Toast.Style.Failure, "Enter a host first");
      return;
    }
    setIsBusy(true);
    const toast = await showToast(Toast.Style.Animated, "Checking DNS…");
    try {
      const response = await fetch(`${url}domain.validateDomain`, {
        method: "POST",
        headers,
        body: JSON.stringify({ domain: values.host.trim(), ...(serverId ? { serverId } : {}) }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      const result = (await response.json()) as unknown;
      const valid =
        typeof result === "boolean"
          ? result
          : Boolean(
              (result as { valid?: boolean; isValid?: boolean })?.valid ??
                (result as { valid?: boolean; isValid?: boolean })?.isValid,
            );

      toast.style = valid ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = valid ? "DNS points to this server" : "DNS does not point to this server yet";
      if (!valid) {
        toast.message = "The domain won't work until its DNS record points here. You can still save it now.";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not check DNS";
      toast.message = `${error}`;
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Form
      isLoading={containersLoading || isBusy}
      navigationTitle={`${service.name} - Add Domain`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Add Domain" onSubmit={handleSubmit} />
          {serverId && <Action icon={Icon.Wand} title="Generate Domain" onAction={generateDomain} />}
          <Action icon={Icon.Network} title="Validate Domain" onAction={checkDns} />
          {isCompose && containersError && (
            <Action icon={Icon.ArrowClockwise} title="Retry Loading Containers" onAction={() => retryContainers()} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Host" placeholder="app.example.com" {...itemProps.host} />
      {isCompose &&
        (containersError ? (
          <Form.Description title="Container" text={`Could not load containers: ${containersError}`} />
        ) : (
          <Form.Dropdown
            title="Container"
            info="Which container in the stack this domain routes to."
            {...itemProps.containerServiceName}
          >
            {containers?.map((name) => <Form.Dropdown.Item key={name} title={name} value={name} />)}
          </Form.Dropdown>
        ))}
      <Form.TextField title="Path" placeholder="/" {...itemProps.path} />
      <Form.TextField title="Port" placeholder="3000" info="The container's own port." {...itemProps.port} />
      <Form.Checkbox title="HTTPS" label="Serve this domain over HTTPS" {...itemProps.https} />
      {values.https && (
        <Form.Dropdown title="Certificate Type" {...itemProps.certificateType}>
          {CERTIFICATE_TYPES.map((type) => (
            <Form.Dropdown.Item key={type.value} title={type.title} value={type.value} />
          ))}
        </Form.Dropdown>
      )}
      {values.https && values.certificateType === "custom" && (
        <Form.TextField
          title="Certificate Resolver"
          placeholder="my-resolver"
          info="The Traefik cert resolver to use for this domain."
          {...itemProps.customCertResolver}
        />
      )}
    </Form>
  );
}
