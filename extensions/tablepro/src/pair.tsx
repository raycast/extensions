import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  LocalStorage,
  Toast,
  showHUD,
  showToast,
  useNavigation,
  popToRoot,
} from "@raycast/api";
import {
  FormValidation,
  showFailureToast,
  useCachedPromise,
  useForm,
} from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { hostname } from "os";
import { TableProNotInstalledError } from "./lib/types";
import { loadConnections } from "./lib/connections";
import { tableProInstalled } from "./lib/paths";
import { pairDeeplink } from "./lib/deeplink";
import { exchangePairingCode, resetClient } from "./lib/mcp";
import {
  PAIR_CALLBACK_URL,
  clearPendingVerifier,
  generatePKCE,
  isValidPairingCode,
  isVerifierExpired,
  loadPendingVerifier,
  savePendingVerifier,
} from "./lib/pairing";
import {
  STORAGE_KEYS,
  clearApiToken,
  migrateApiTokenIfNeeded,
} from "./lib/storage";
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
  if (incomingCode !== undefined) {
    if (!isValidPairingCode(incomingCode)) {
      return (
        <Detail
          markdown={
            "# Invalid pairing code\n\nThe code TablePro returned was not a valid identifier. Run Pair with TablePro again."
          }
        />
      );
    }
    return <ExchangeView code={incomingCode.trim()} />;
  }
  return <PairForm />;
}

function PairForm() {
  const [hasToken, setHasToken] = useState(false);
  const challengeRef = useRef<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateApiTokenIfNeeded();
      const token = await LocalStorage.getItem<string>(STORAGE_KEYS.apiToken);
      if (cancelled) return;
      setHasToken(typeof token === "string" && token.trim().length > 0);

      await clearPendingVerifier();
      const { verifier, challenge } = generatePKCE();
      await savePendingVerifier(verifier);
      challengeRef.current = challenge;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { handleSubmit, itemProps, values } = useForm<PairFormValues>({
    async onSubmit(formValues) {
      try {
        let challenge = challengeRef.current;
        if (!challenge) {
          const fresh = generatePKCE();
          await savePendingVerifier(fresh.verifier);
          challengeRef.current = fresh.challenge;
          challenge = fresh.challenge;
        }
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
        await showToast({
          style: Toast.Style.Animated,
          title: "Waiting for TablePro approval…",
        });
      } catch (err) {
        await showFailureToast(err, { title: "Failed to start pairing" });
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
          {hasToken ? (
            <Action
              title="Sign Out"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={async () => {
                await clearApiToken();
                await clearPendingVerifier();
                setHasToken(false);
                await showHUD("Signed out of TablePro");
              }}
            />
          ) : null}
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
  const cancelledRef = useRef(false);
  const { pop } = useNavigation();

  useEffect(() => {
    cancelledRef.current = false;
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        if (!tableProInstalled()) throw new TableProNotInstalledError();
        const pending = await loadPendingVerifier();
        if (!pending) {
          throw new Error(
            "Pairing verifier missing. Run Pair with TablePro again.",
          );
        }
        if (isVerifierExpired(pending)) {
          await clearPendingVerifier();
          throw new Error(
            "Pairing request expired. Run Pair with TablePro again.",
          );
        }
        const exchange = await exchangePairingCode(code, pending.verifier);
        if (cancelledRef.current) return;
        await persistToken(exchange.token);
        await clearPendingVerifier();
        resetClient();
        setCompleted(true);
        await showHUD("Paired with TablePro");
        await popToRoot({ clearSearchBar: true });
      } catch (err) {
        await clearPendingVerifier();
        if (cancelledRef.current) return;
        setError(err);
      }
    })();
    return () => {
      cancelledRef.current = true;
    };
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
      actions={
        completed ? undefined : (
          <ActionPanel>
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={async () => {
                cancelledRef.current = true;
                await clearPendingVerifier();
                pop();
              }}
            />
          </ActionPanel>
        )
      }
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
    case "remote-unsupported":
      return "# Remote access not supported\n\nRaycast can only talk to TablePro on the local machine. Disable remote access in TablePro Settings and try again.";
    case "access-denied":
      return `# Access denied\n\n${scenario.message}`;
    case "other":
      return `# Pairing failed\n\n${scenario.message}`;
  }
}
