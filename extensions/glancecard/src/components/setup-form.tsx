// The setup editor: the website's editor as a Form, started from the workflow the viewer already
// has (or the README's defaults) and from the card it was opened on.
import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { REPO_SECTIONS } from "glancecard";
import { DARK_LOOKS, LOOKS, STARS, hours, lightOf } from "glancecard/setup";
import { useMemo, useRef } from "react";
import { timeZone } from "../lib/github";
import { useMyRepositories } from "../lib/hooks";
import { lookTitle } from "../lib/looks";
import { DEFAULT_SETUP, readSetupStatus, type Setup, type SetupStatus } from "../lib/setup";
import { PatchResult, SetupResult } from "./setup-result";

/** What a card asks of the setup: itself among the cards, in its look, drawn its way. */
export interface SetupRequest {
  profile: boolean;
  repo?: string;
  choice: Pick<Setup["choice"], "mode" | "dark" | "light" | "look" | "calendar" | "stars">;
  sections?: string[];
}

export function useSetupStatus() {
  return useCachedPromise(readSetupStatus, [timeZone()], {
    failureToastOptions: { title: "Could not read your GitHub" },
  });
}

/** The setup to start from: the existing workflow's, or the defaults, with the card's request on top. */
function startingSetup(status: SetupStatus | undefined, request: SetupRequest | undefined): Setup {
  const base = status?.workflow?.setup ?? DEFAULT_SETUP(timeZone());
  if (!request) return base;
  return {
    profile: base.profile || request.profile,
    repos: request.repo && !base.repos.includes(request.repo) ? [...base.repos, request.repo] : base.repos,
    choice: { ...base.choice, ...request.choice, sections: request.sections ?? base.choice.sections },
  };
}

const ZONES = (() => {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
})();

/** The zones to offer, the one already chosen among them even when the list spells it otherwise (Asia/Kolkata, Etc/UTC). */
const zonesWith = (zone: string) => (ZONES.includes(zone) ? ZONES : [zone, ...ZONES]);

interface Values {
  profile: boolean;
  repos: string[];
  mode: string;
  dark: string;
  light: string;
  look: string;
  calendar: string;
  stars: string;
  sections: string[];
  zone: string;
  often: string;
  hour: string;
}

/** "Use on GitHub" from a card: the whole setup without a workflow yet, the one card's change with one. */
export function UseOnGitHub({ request }: { request: SetupRequest }) {
  const { data: status, isLoading, error } = useSetupStatus();
  // The kept status may predate a commit: a change made from it would undo that commit.
  // A failed refresh leaves the kept status in place: never patch from it either.
  if (!status || isLoading || error) {
    return <Detail isLoading={isLoading} markdown={error ? `# Could not read your GitHub\n\n${error.message}` : ""} />;
  }
  if (status.workflow) return <PatchResult request={request} status={status} workflow={status.workflow} />;
  return <SetupForm request={request} />;
}

export function SetupForm({ request }: { request?: SetupRequest }) {
  const { data: status, isLoading, error } = useSetupStatus();
  const { data: mine, isLoading: loadingRepos } = useMyRepositories();
  const { push } = useNavigation();
  const start = useMemo(() => startingSetup(status, request), [status, request]);

  // Shown until GitHub answers, kept status included: a form whose defaults would be wrong a second later.
  if (!status || isLoading || error) {
    return (
      <Form isLoading={isLoading}>
        <Form.Description text={error ? `Could not read your GitHub: ${error.message}` : "Reading your GitHub…"} />
      </Form>
    );
  }
  return (
    <SetupFields
      start={start}
      status={status}
      repositories={mine.map((r) => r.nameWithOwner)}
      isLoading={isLoading || loadingRepos}
      onSubmit={(setup) => push(<SetupResult setup={setup} status={status} />)}
    />
  );
}

function SetupFields(props: {
  start: Setup;
  status: SetupStatus;
  repositories: string[];
  isLoading: boolean;
  onSubmit: (setup: Setup) => void;
}) {
  const { start, status, isLoading, onSubmit } = props;
  const repositories = [...new Set([...start.repos, ...props.repositories])];
  // The other fields, for a field's validation: the form's values as of the last render.
  const latest = useRef({ profile: start.profile, repos: start.repos });
  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: {
      profile: start.profile,
      repos: start.repos,
      mode: start.choice.mode,
      dark: start.choice.dark,
      light: start.choice.light,
      look: start.choice.look,
      calendar: start.choice.calendar,
      stars: start.choice.stars,
      sections: start.choice.sections.length ? start.choice.sections : REPO_SECTIONS,
      zone: start.choice.refresh.zone,
      often: start.choice.refresh.often,
      hour: String(start.choice.refresh.utcHour),
    },
    validation: {
      // A workflow draws something: the profile card, a repository's, or both.
      repos: (value) =>
        !value?.length && !latest.current.profile ? "Pick the profile card or a repository" : undefined,
      sections: (value) => (latest.current.repos.length && !value?.length ? "Keep one section at least" : undefined),
    },
    onSubmit: (v) =>
      onSubmit({
        profile: v.profile,
        repos: v.repos,
        choice: {
          mode: v.mode === "one" ? "one" : "follow",
          dark: v.mode === "follow" ? v.dark : start.choice.dark,
          light: v.light === "daylight" ? "daylight" : "own",
          look: v.mode === "one" ? v.look : v.dark,
          calendar: v.calendar,
          stars: v.stars,
          // All of them is the Action's default, and writes no `sections` line.
          sections: v.sections?.length && v.sections.length < REPO_SECTIONS.length ? v.sections : [],
          refresh: { often: v.often === "week" ? "week" : "day", utcHour: Number(v.hour), zone: v.zone },
        },
      }),
  });
  latest.current = { profile: values.profile, repos: values.repos };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={status.workflow ? "Change Your Glancecard Setup" : "Set up Glancecard"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Prepare the Setup" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Cards live in"
        text={`${status.login}/${status.login}${status.home ? "" : " (not created yet: the next step offers it)"}`}
      />
      <Form.Checkbox label="My profile card" {...itemProps.profile} />
      <Form.TagPicker title="Repository cards" {...itemProps.repos}>
        {repositories.map((full) => (
          <Form.TagPicker.Item key={full} value={full} title={full} />
        ))}
      </Form.TagPicker>

      <Form.Separator />
      <Form.Dropdown title="The card" {...itemProps.mode}>
        <Form.Dropdown.Item value="follow" title="Follows the reader's GitHub theme" />
        <Form.Dropdown.Item value="one" title="Wears one look always" />
      </Form.Dropdown>
      {values.mode === "follow" ? (
        <>
          <Form.Dropdown title="Dark look" {...itemProps.dark}>
            {DARK_LOOKS.map((look) => (
              <Form.Dropdown.Item key={look} value={look} title={lookTitle(look)} />
            ))}
          </Form.Dropdown>
          {/* A tube or the Workbench is its own light side, one file; Daylight pairs with any look, as on the website. */}
          <Form.Dropdown title="Light side" {...itemProps.light}>
            <Form.Dropdown.Item
              value="own"
              title={
                lightOf(values.dark) === values.dark
                  ? `Its own: ${lookTitle(values.dark)} on both themes, one file`
                  : `Its own: ${lookTitle(lightOf(values.dark))}`
              }
            />
            <Form.Dropdown.Item value="daylight" title="Daylight" />
          </Form.Dropdown>
        </>
      ) : (
        <Form.Dropdown title="Look" {...itemProps.look}>
          {LOOKS.map((look) => (
            <Form.Dropdown.Item key={look} value={look} title={lookTitle(look)} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown title="A year" {...itemProps.calendar}>
        <Form.Dropdown.Item value="chart" title="A line of daily counts" />
        <Form.Dropdown.Item value="grid" title="GitHub's calendar" />
      </Form.Dropdown>
      <Form.Dropdown title="Stars" {...itemProps.stars}>
        {STARS.map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={lookTitle(s)} />
        ))}
      </Form.Dropdown>
      {values.repos.length ? (
        <Form.TagPicker title="Repository sections" {...itemProps.sections}>
          {REPO_SECTIONS.map((s) => (
            <Form.TagPicker.Item key={s} value={s} title={lookTitle(s)} />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.Separator />
      <Form.Dropdown title="Time zone" {...itemProps.zone}>
        {zonesWith(values.zone).map((z) => (
          <Form.Dropdown.Item key={z} value={z} title={z} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Refresh" {...itemProps.often}>
        <Form.Dropdown.Item value="day" title="Every day" />
        <Form.Dropdown.Item value="week" title="Every Monday" />
      </Form.Dropdown>
      <Form.Dropdown
        title="At"
        info="GitHub starts scheduled runs late at busy hours, sometimes by an hour"
        {...itemProps.hour}
      >
        {hours(values.zone).map((h) => (
          <Form.Dropdown.Item key={h.utcHour} value={String(h.utcHour)} title={`${h.label} (${h.utcHour}:30 UTC)`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
