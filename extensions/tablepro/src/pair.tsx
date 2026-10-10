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
import { loadConnections } from "./lib/connections";
import { assertInstalledVersionSupported, requireTablePro } from "./lib/app";
import { PairScope, pairDeeplink } from "./lib/deeplink";
import { exchangePairingCode, resetClient } from "./lib/mcp";
import {
  clearPendingVerifier,
  generatePKCE,
  isValidPairingCode,
  isVerifierExpired,
  loadPendingVerifier,
  pairCallbackUrl,
  savePendingVerifier,
} from "./lib/pairing";
import {
  STORAGE_KEYS,
  clearApiToken,
  migrateApiTokenIfNeeded,
} from "./lib/storage";
import { classifyError, describeScenario } from "./lib/errors";

interface LaunchContext {
  code?: string;
  error?: string;
}

interface PairFormValues {
  client: string;
  scope: string;
  connections: string[];
}

const READ_ONLY = "readOnly";

const SCOPE_OPTIONS: Array<{
  value: typeof READ_ONLY | PairScope;
  label: string;
  hint: string;
}> = [
  {
    value: READ_ONLY,
    label: "Read Only",
    hint: "List connections, browse schema, run SELECT.",
  },
  {
    value: "readWrite",
    label: "Read & Write",
    hint: "Adds INSERT, UPDATE, DELETE, MERGE.",
  },
  {
    value: "fullAccess",
    label: "Full Access",
    hint: "Adds DDL (CREATE, ALTER, DROP) and admin operations.",
  },
];

function requestedScope(value: string): PairScope | undefined {
  return value === "readWrite" || value === "fullAccess" ? value : undefined;
}

async function checkTablePro(): Promise<void> {
  const app = await requireTablePro();
  await assertInstalledVersionSupported(app);
}

export default function PairCommand(
  props: LaunchProps<{ launchContext: LaunchContext }>,
) {
  const incomingError = props.launchContext?.error;
  if (incomingError !== undefined) {
    return <DeniedView error={incomingError} />;
  }
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
      await checkTablePro();
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
          redirect: pairCallbackUrl(),
          scope: requestedScope(formValues.scope),
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
      scope: READ_ONLY,
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
        await checkTablePro();
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

function DeniedView({ error }: { error: string }) {
  useEffect(() => {
    clearPendingVerifier().catch(() => undefined);
  }, []);
  const markdown =
    error === "denied"
      ? "# Pairing denied\n\nTablePro did not approve the request. Run Pair with TablePro to try again."
      : "# Pairing failed\n\nTablePro did not issue a token. Run Pair with TablePro to try again.";
  return <Detail markdown={markdown} />;
}

function renderErrorMarkdown(err: unknown): string {
  const scenario = classifyError(err);
  if (scenario.kind === "other") {
    return `# Pairing failed\n\n${scenario.message}`;
  }
  const { title, description } = describeScenario(scenario);
  return `# ${title}\n\n${description}`;
}
