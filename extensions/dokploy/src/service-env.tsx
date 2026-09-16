import { Action, ActionPanel, Detail, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { useToken } from "./instances";
import { ErrorResult, ServiceEnvironment } from "./interfaces";
import { countVariables, maskValues, parseEnv } from "./env";

const ID_FIELDS: Record<string, string> = {
  application: "applicationId",
  mariadb: "mariadbId",
  mongo: "mongoId",
  mysql: "mysqlId",
  postgres: "postgresId",
  redis: "redisId",
  compose: "composeId",
};

/** The three strings an application stores, in the order a build reads them. */
const SECTIONS = [
  {
    key: "env" as const,
    title: "Environment",
    /** Every kind has this one; the other two are an application's build and nothing else's. */
    always: true,
    empty: "_No environment variables set._",
  },
  { key: "buildArgs" as const, title: "Build Arguments", always: false, empty: "_No build arguments set._" },
  { key: "buildSecrets" as const, title: "Build Secrets", always: false, empty: "_No build secrets set._" },
];

function renderSection(title: string, value: string | null, empty: string, revealed: boolean): string {
  const lines = value ? parseEnv(value) : [];
  const count = countVariables(lines);
  const heading = count > 0 ? `### ${title} (${count})` : `### ${title}`;

  if (!value || value.trim() === "") return `${heading}\n\n${empty}`;
  return `${heading}\n\n\`\`\`\n${revealed ? value.trimEnd() : maskValues(lines)}\n\`\`\``;
}

interface ServiceEnvDetail {
  env?: string | null;
  buildArgs?: string | null;
  buildSecrets?: string | null;
  createEnvFile?: boolean;
  buildType?: string | null;
}

/**
 * A service's environment, and for an application its build arguments and build secrets too.
 *
 * Masked until asked for. Reading your own env on your own machine is not the risk - doing it while
 * screen-sharing is, and that is exactly when you reach for Raycast. Build secrets deserve the
 * exception least of all: they exist precisely because a value was too sensitive to bake into an
 * image.
 */
export default function ServiceEnv({
  service,
}: {
  service: { id: string; type: string; name: string; appName?: string };
}) {
  const { url, headers } = useToken();
  const [revealed, setRevealed] = useState(false);

  const isApplication = service.type === "application";
  // Falls back to the id so an unnamed service (Dokploy allows saving one without a name) still
  // reads as *a specific service* rather than the literal string "undefined".
  const displayName = service.name || service.appName || service.id;

  const { data, isLoading, error, revalidate } = useFetch<ServiceEnvironment, ServiceEnvironment | undefined>(
    `${url}${service.type}.one?${ID_FIELDS[service.type]}=${service.id}`,
    {
      headers,
      async parseResponse(response) {
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        const detail = (await response.json()) as ServiceEnvDetail;
        return {
          env: detail.env ?? null,
          // Kept even when hidden below: `application.saveEnvironment` always writes these three
          // together (see the form's `submit`), so the save has to round-trip whatever they really
          // are, not the empty value a gate-to-null here would quietly overwrite them with.
          buildArgs: isApplication ? (detail.buildArgs ?? null) : null,
          buildSecrets: isApplication ? (detail.buildSecrets ?? null) : null,
          createEnvFile: isApplication ? (detail.createEnvFile ?? false) : false,
          // Dokploy only applies these for a dockerfile build - nixpacks, railpack, heroku, paketo
          // and static ignore them, so this is what decides whether the UI offers them, not whether
          // the save carries them.
          supportsBuildFields: isApplication && detail.buildType === "dockerfile",
        };
      },
    },
  );

  const visibleSections = SECTIONS.filter((section) => section.always || data?.supportsBuildFields);
  const isEmpty = !data || visibleSections.every((section) => !data[section.key]?.trim());

  const body = error
    ? `> Could not load environment variables: ${error}`
    : !data
      ? ""
      : visibleSections
          .map((section) => renderSection(section.title, data[section.key], section.empty, revealed))
          .join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${displayName} - Environment`}
      markdown={`## ${displayName}\n\n${body}`}
      actions={
        <ActionPanel>
          {/* Only once the current values are actually in hand. `Action.Push` builds its target as
              it renders, so an Edit offered mid-fetch would seed the form with empty strings and
              the next Save would wipe every variable the service has. Same for a fetch that failed. */}
          {data !== undefined && (
            <Action.Push
              title="Edit Variables"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<ServiceEnvForm service={service} initial={data} onSaved={revalidate} />}
            />
          )}
          {!isEmpty && (
            <Action
              title={revealed ? "Hide Values" : "Reveal Values"}
              icon={revealed ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={() => setRevealed((current) => !current)}
            />
          )}
          {data?.env && (
            <Action.CopyToClipboard
              title="Copy Environment File"
              content={data.env}
              // Concealed: this is a file full of secrets, and it should not outlive the paste in
              // Raycast's clipboard history.
              concealed
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
    />
  );
}

interface ServiceEnvFormProps {
  service: { id: string; type: string; name: string; appName?: string };
  initial: ServiceEnvironment;
  onSaved: () => void;
}

/**
 * One form for all three strings, because `application.saveEnvironment` writes all three at once.
 *
 * Separate editors would each still have to carry the other two along, from whatever they happened
 * to be when that form opened - so two of them open at once would race, and the later save would
 * silently revert the earlier one. One form, one write, one set of values.
 */
function ServiceEnvForm({ service, initial, onSaved }: ServiceEnvFormProps) {
  const { url, headers } = useToken();
  const [env, setEnv] = useState(initial.env ?? "");
  const [buildArgs, setBuildArgs] = useState(initial.buildArgs ?? "");
  const [buildSecrets, setBuildSecrets] = useState(initial.buildSecrets ?? "");
  const [createEnvFile, setCreateEnvFile] = useState(initial.createEnvFile);
  const [isSaving, setIsSaving] = useState(false);
  const { pop } = useNavigation();
  const displayName = service.name || service.appName || service.id;

  /**
   * A field the user didn't touch goes back exactly as it came.
   *
   * Dokploy tells "never set" (`null`) apart from "set to an empty string", and a `Form.TextArea`
   * cannot hold `null` - it holds `""`. So saving what the form has would quietly rewrite every
   * untouched null as an empty string. Comparing against what was loaded is what keeps a save from
   * changing a field nobody edited.
   */
  function asLoadedUnlessEdited(value: string, original: string | null): string | null {
    return value === (original ?? "") ? original : value;
  }

  async function submit() {
    setIsSaving(true);
    const toast = await showToast(Toast.Style.Animated, `Saving ${displayName}…`);

    try {
      const isApplication = service.type === "application";
      const body: Record<string, unknown> = isApplication
        ? {
            applicationId: service.id,
            env: asLoadedUnlessEdited(env, initial.env),
            buildArgs: asLoadedUnlessEdited(buildArgs, initial.buildArgs),
            buildSecrets: asLoadedUnlessEdited(buildSecrets, initial.buildSecrets),
            createEnvFile,
          }
        : { [ID_FIELDS[service.type]]: service.id, env: asLoadedUnlessEdited(env, initial.env) };
      const endpoint = isApplication ? "application.saveEnvironment" : `${service.type}.saveEnvironment`;

      const response = await fetch(url + endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Saved Environment";
      // Dokploy writes the variables now but the container keeps the ones it started with, so
      // saying "saved" without this reads as "applied" and it isn't.
      toast.message = "Redeploy the service to apply them.";
      onSaved();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not save environment";
      toast.message = `${error}`;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      navigationTitle={`${displayName} - Edit Environment`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="env"
        title="Environment"
        placeholder={"DATABASE_URL=postgresql://…\nPORT=3000"}
        value={env}
        onChange={setEnv}
        info="One KEY=value per line. Comments starting with # are kept. Saving does not restart the service."
      />

      {initial.supportsBuildFields && (
        <>
          <Form.Separator />
          <Form.TextArea
            id="buildArgs"
            title="Build Arguments"
            placeholder="NODE_VERSION=20"
            value={buildArgs}
            onChange={setBuildArgs}
            info="Passed to the Docker build as --build-arg. Available while the image is built, not while it runs. They are recorded in the image's history, so a secret does not belong here."
          />
          <Form.TextArea
            id="buildSecrets"
            title="Build Secrets"
            placeholder="NPM_TOKEN=…"
            value={buildSecrets}
            onChange={setBuildSecrets}
            info="Mounted into the build as BuildKit secrets and never written into the image. This is where a token that is only needed to build belongs."
          />
          <Form.Checkbox
            id="createEnvFile"
            label="Write the environment to a .env file"
            value={createEnvFile}
            onChange={setCreateEnvFile}
          />
        </>
      )}
    </Form>
  );
}
