// The setup editor: the website's editor as a Form, started from the workflow the viewer already
// has (or the README's defaults) and from the card it was opened on.
import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { REPO_SECTIONS } from "glancecard";
import { DARK_LOOKS, LOOKS, STARS, hours, lightOf } from "glancecard/setup";
import { useMemo, useState } from "react";
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
  mode: "follow" | "one";
  dark: string;
  light: "own" | "daylight";
  look: string;
  calendar: string;
  stars: string;
  sections: string[];
  zone: string;
  often: "day" | "week";
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
  const [mode, setMode] = useState(start.choice.mode);
  const [dark, setDark] = useState(start.choice.dark);
  const [zone, setZone] = useState(start.choice.refresh.zone);
  const [repos, setRepos] = useState(start.repos);
  const [nothing, setNothing] = useState<string | undefined>();
  const repositories = [...new Set([...start.repos, ...props.repositories])];
  const zoneHours = hours(zone);

  const submit = (v: Values) => {
    if (!v.profile && !v.repos.length) return setNothing("Pick the profile card or a repository");
    onSubmit({
      profile: v.profile,
      repos: v.repos,
      choice: {
        mode: v.mode,
        dark: v.mode === "follow" ? v.dark : start.choice.dark,
        light: v.light ?? "own",
        look: v.mode === "one" ? v.look : v.dark,
        calendar: v.calendar,
        stars: v.stars,
        // All of them is the Action's default, and writes no `sections` line.
        sections: v.sections?.length && v.sections.length < REPO_SECTIONS.length ? v.sections : [],
        refresh: { often: v.often, utcHour: Number(v.hour), zone: v.zone },
      },
    });
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={status.workflow ? "Change Your Glancecard Setup" : "Set up Glancecard"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Prepare the Setup" icon={Icon.Wand} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Cards live in"
        text={`${status.login}/${status.login}${status.home ? "" : " (not created yet: the next step offers it)"}`}
      />
      <Form.Checkbox
        id="profile"
        label="My profile card"
        defaultValue={start.profile}
        error={nothing}
        onChange={() => setNothing(undefined)}
      />
      <Form.TagPicker
        id="repos"
        title="Repository cards"
        value={repos}
        onChange={(value) => {
          setRepos(value);
          setNothing(undefined);
        }}
      >
        {repositories.map((full) => (
          <Form.TagPicker.Item key={full} value={full} title={full} />
        ))}
      </Form.TagPicker>

      <Form.Separator />
      <Form.Dropdown id="mode" title="The card" value={mode} onChange={(v) => setMode(v as Values["mode"])}>
        <Form.Dropdown.Item value="follow" title="Follows the reader's GitHub theme" />
        <Form.Dropdown.Item value="one" title="Wears one look always" />
      </Form.Dropdown>
      {mode === "follow" ? (
        <>
          <Form.Dropdown id="dark" title="Dark look" value={dark} onChange={setDark}>
            {DARK_LOOKS.map((look) => (
              <Form.Dropdown.Item key={look} value={look} title={lookTitle(look)} />
            ))}
          </Form.Dropdown>
          {lightOf(dark) === dark ? (
            <Form.Description title="Light side" text={`${lookTitle(dark)} reads the same on both themes: one file`} />
          ) : (
            <Form.Dropdown id="light" title="Light side" defaultValue={start.choice.light}>
              <Form.Dropdown.Item value="own" title={`Its own: ${lookTitle(lightOf(dark))}`} />
              <Form.Dropdown.Item value="daylight" title="Daylight" />
            </Form.Dropdown>
          )}
        </>
      ) : (
        <Form.Dropdown id="look" title="Look" defaultValue={start.choice.look}>
          {LOOKS.map((look) => (
            <Form.Dropdown.Item key={look} value={look} title={lookTitle(look)} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="calendar" title="A year" defaultValue={start.choice.calendar}>
        <Form.Dropdown.Item value="chart" title="A line of daily counts" />
        <Form.Dropdown.Item value="grid" title="GitHub's calendar" />
      </Form.Dropdown>
      <Form.Dropdown id="stars" title="Stars" defaultValue={start.choice.stars}>
        {STARS.map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={lookTitle(s)} />
        ))}
      </Form.Dropdown>
      {repos.length ? (
        <Form.TagPicker
          id="sections"
          title="Repository sections"
          defaultValue={start.choice.sections.length ? start.choice.sections : REPO_SECTIONS}
        >
          {REPO_SECTIONS.map((s) => (
            <Form.TagPicker.Item key={s} value={s} title={lookTitle(s)} />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.Separator />
      <Form.Dropdown id="zone" title="Time zone" value={zone} onChange={setZone}>
        {zonesWith(zone).map((z) => (
          <Form.Dropdown.Item key={z} value={z} title={z} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="often" title="Refresh" defaultValue={start.choice.refresh.often}>
        <Form.Dropdown.Item value="day" title="Every day" />
        <Form.Dropdown.Item value="week" title="Every Monday" />
      </Form.Dropdown>
      <Form.Dropdown
        id="hour"
        title="At"
        info="GitHub starts scheduled runs late at busy hours, sometimes by an hour"
        defaultValue={String(start.choice.refresh.utcHour)}
      >
        {zoneHours.map((h) => (
          <Form.Dropdown.Item key={h.utcHour} value={String(h.utcHour)} title={`${h.label} (${h.utcHour}:30 UTC)`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
