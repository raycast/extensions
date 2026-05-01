import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  LocalStorage,
  Toast,
  showToast,
  showHUD,
  useNavigation,
  popToRoot,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { hostname } from "os";
import { TableProNotInstalledError } from "./lib/types";
import { loadConnections } from "./lib/connections";
import { tableProInstalled } from "./lib/paths";
import { pairDeeplink } from "./lib/deeplink";
import { exchangePairingCode } from "./lib/mcp";
import { generatePKCE, PAIR_CALLBACK_URL, STORAGE_KEYS } from "./lib/pairing";
import { classifyError } from "./lib/errors";

interface LaunchContext {
  code?: string;
}

interface PairFormValues {
  client: string;
  scope: string;
  connections: string[];
}

const SCOPE_OPTIONS = [
  {
    value: "read",
    label: "Read-only",
    hint: "List connections, browse schema, run SELECT.",
  },
  {
    value: "read-write",
    label: "Read & write",
    hint: "Adds INSERT, UPDATE, DELETE, MERGE.",
  },
  {
    value: "full",
    label: "Full access",
    hint: "Adds DDL (CREATE, ALTER, DROP) and admin operations.",
  },
];

export default function PairCommand(
  props: LaunchProps<{ launchContext: LaunchContext }>,
) {
  const incomingCode = props.launchContext?.code;
  if (incomingCode) {
    return <ExchangeView code={incomingCode} />;
  }
  return <PairForm />;
}

function PairForm() {
  const {
    data: connections,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      if (!tableProInstalled()) throw new TableProNotInstalledError();
      return loadConnections();
    },
    [],
    { keepPreviousData: true },
  );

  const { handleSubmit, itemProps, values } = useForm<PairFormValues>({
    async onSubmit(formValues) {
      try {
        const { verifier, challenge } = generatePKCE();
        await LocalStorage.setItem(STORAGE_KEYS.pendingVerifier, verifier);
        await pairDeeplink({
          client: formValues.client,
          challenge,
          redirect: PAIR_CALLBACK_URL,
          scopes: [formValues.scope],
          connectionIds:
            formValues.connections.length > 0
              ? formValues.connections
              : undefined,
        });
        await showHUD("Approve pairing in TablePro");
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to start pairing",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    initialValues: {
      client: `Raycast on ${hostname()}`,
      scope: "read",
      connections: [],
    },
    validation: {
      client: FormValidation.Required,
      scope: FormValidation.Required,
    },
  });

  if (error) {
    return <Detail markdown={renderErrorMarkdown(error)} />;
  }

  const selectedScope =
    SCOPE_OPTIONS.find((option) => option.value === values.scope) ??
    SCOPE_OPTIONS[0]!;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Pair with TablePro"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue in TablePro"
            icon={Icon.AppWindow}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser
            title="Learn About Pairing"
            icon={Icon.QuestionMark}
            url="https://tablepro.app/docs/raycast"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Client Name"
        placeholder="Raycast on this Mac"
        {...itemProps.client}
      />
      <Form.Dropdown title="Permissions" {...itemProps.scope}>
        {SCOPE_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text={selectedScope.hint} />
      <Form.TagPicker
        title="Allowed Connections"
        info="Leave empty to allow all current and future connections."
        {...itemProps.connections}
      >
        {(connections ?? []).map((connection) => (
          <Form.TagPicker.Item
            key={connection.id}
            value={connection.id}
            title={connection.name}
          />
        ))}
      </Form.TagPicker>
      <Form.Description text="TablePro shows an approval sheet next. Approve there and the token lands here automatically." />
    </Form>
  );
}

function ExchangeView({ code }: { code: string }) {
  const [error, setError] = useState<unknown>(null);
  const [completed, setCompleted] = useState(false);
  const ranRef = useRef(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        const verifier = await LocalStorage.getItem<string>(
          STORAGE_KEYS.pendingVerifier,
        );
        if (!verifier) {
          throw new Error(
            "Pairing verifier missing. Run Pair with TablePro again.",
          );
        }
        const exchange = await exchangePairingCode(code, verifier);
        await persistToken(exchange.token);
        await LocalStorage.removeItem(STORAGE_KEYS.pendingVerifier);
        setCompleted(true);
        await showHUD("Paired with TablePro");
        await popToRoot({ clearSearchBar: true });
      } catch (err) {
        setError(err);
      }
    })();
  }, [code]);

  if (error) {
    return (
      <Detail
        markdown={renderErrorMarkdown(error)}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.RotateClockwise}
              onAction={pop}
            />
          </ActionPanel>
        }
      />
    );
  }

  const message = completed
    ? "Paired. You can close this window."
    : "Exchanging the pairing code with TablePro.";

  return (
    <Detail
      markdown={`# Finishing pairing\n\n${message}`}
      isLoading={!completed}
    />
  );
}

async function persistToken(token: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.apiToken, token);
}

function renderErrorMarkdown(err: unknown): string {
  const scenario = classifyError(err);
  switch (scenario.kind) {
    case "not-installed":
      return "# TablePro is not installed\n\nInstall TablePro from [tablepro.app](https://tablepro.app), then run this command again.";
    case "mcp-not-running":
      return "# TablePro is not running\n\nOpen TablePro and try again. The MCP server starts on demand.";
    case "no-token":
      return "# No token yet\n\nFinish the pairing flow to issue one.";
    case "token-revoked":
      return "# Token was revoked\n\nRun this command to issue a new one.";
    case "access-denied":
      return `# Access denied\n\n${scenario.message}`;
    case "other":
      return `# Pairing failed\n\n${scenario.message}`;
  }
}
