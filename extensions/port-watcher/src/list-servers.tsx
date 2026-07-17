import {
  List,
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Color,
  useNavigation,
  Keyboard,
  open,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { randomUUID } from "crypto";
import { readListeningPorts, killListener, waitForExit, isExposed, type ListeningPort, type Kind } from "./system";
import {
  readProfiles,
  writeProfiles,
  checkProjectFolder,
  suggestRunCommand,
  draftProfileFromPort,
  detectStack,
  displayPath,
  canonicalCwd,
  PROFILES_DIR,
  PROFILES_FILE,
  type Profile,
} from "./profiles";
import { matchProfiles, profileKeywords, listenerKeywords } from "./matching";
import { launchProfile, watchLaunch, logFileFor, listLaunchedProfiles } from "./launch";

type Scope = "mine" | "all";

const KIND_LABEL: Record<Kind, string> = {
  project: "Project",
  container: "Container",
  system: "System",
};

const KIND_COLOR: Record<Kind, Color> = {
  project: Color.Green,
  container: Color.Blue,
  system: Color.SecondaryText,
};

// Brand colors, so a stack is recognizable before it is read. They live here
// and not next to detectStack on purpose: profiles.ts imports nothing from
// Raycast, which is what keeps it testable as plain Node. That module reports
// what a project IS; painting it is this one's job.
//
// Next and Remix are black-on-white brands, and Django a near-black green: a
// fixed value would vanish in one theme or the other, so they get a light/dark
// pair. That is not a compromise on the brand — it is how those logos already
// invert. Raycast adjusts contrast on the rest by default, which is the right
// trade here: legible beats exact.
const STACK_COLOR: Record<string, Color.ColorLike> = {
  "Next.js": { light: "#000000", dark: "#FFFFFF" },
  Remix: { light: "#121212", dark: "#FFFFFF" },
  Django: { light: "#092E20", dark: "#44B78B" },
  Nuxt: "#00DC82",
  Astro: "#FF5D01",
  SvelteKit: "#FF3E00",
  Gatsby: "#663399",
  Angular: "#DD0031",
  React: "#61DAFB",
  Vue: "#42B883",
  Svelte: "#FF3E00",
  Solid: "#2C4F7C",
  Preact: "#673AB8",
  Vite: "#646CFF",
  Webpack: "#8DD6F9",
  Parcel: "#E7A03C",
  Rspack: "#FF9D2E",
  Rust: "#CE422B",
  Go: "#00ADD8",
  PHP: "#777BB4",
};

// "Static site" is deliberately absent: it is a description, not a product, so
// it has no brand to borrow. A neutral tag says that honestly rather than
// inventing a color to look consistent.
const stackColor = (label: string): Color.ColorLike => STACK_COLOR[label] ?? Color.SecondaryText;

// Who started this — the detail's answer, in one line.
//
// The question it settles is "is this one mine, or did an agent spin it up?",
// which lsof cannot answer and which matters the moment three of the node
// servers in your list came from Claude and looked exactly like yours. It stays
// in the properties rather than becoming a third badge on a row: the rows
// already carry what you scan for.
//
// Two sources, and the order is not arbitrary — what we witnessed beats what we
// reconstructed:
//   our own mark  -> we launched it, and we know as which profile. Read back off
//                    the process, not deduced.
//   the lineage   -> everyone else's, walked from the process tree. Tops out at
//                    the app owning the session.
// Neither -> nothing to say. The parent died and launchd adopted the orphan, or
// launchd started it in the first place, which "system" already says.
function startedBy(port: ListeningPort, profiles: Profile[]): string | undefined {
  if (port.launchedProfile) {
    const mine = profiles.find((p) => p.id === port.launchedProfile);
    return mine ? `Port Watcher — ${displayPath(mine.cwd)}` : "Port Watcher";
  }
  return port.lineage?.length ? port.lineage.join("  ←  ") : undefined;
}

// One form for three uses, parameterised by two things:
//   source    : the starting values (undefined = blank form)
//   editingId : the profile to REPLACE (undefined = create a new one)
// Hence: add = neither / edit = both / duplicate or capture = source only.
// Duplicating is nothing but "create, prefilled", so no logic is duplicated
// between the three.
// source is Partial: a draft captured from a running process has no id yet, and
// the id is never read from source anyway (editingId decides create vs replace).
function ProfileForm({
  source,
  editingId,
  onSaved,
}: {
  source?: Partial<Profile>;
  editingId?: string;
  onSaved: () => void;
}) {
  // useNavigation gives us pop(): close this form and go back to the list.
  const { pop } = useNavigation();
  const isEditing = editingId !== undefined;

  // One error per field rather than a global message: Raycast renders it under
  // the offending field, so you see WHAT to fix without re-reading the form.
  const [cwdError, setCwdError] = useState<string>();
  const [runError, setRunError] = useState<string>();
  const [portError, setPortError] = useState<string>();

  // Controlled because they feed each other: the folder drives the run
  // suggestion and the guard rail, and finding out after clicking Save is too
  // late. FilePicker works in arrays, hence the single folder wrapped in one.
  const [cwdValue, setCwdValue] = useState<string[]>(source?.cwd ? [source.cwd] : []);
  const [runValue, setRunValue] = useState(source?.run ?? "");
  const [warning, setWarning] = useState<string>();

  const cwd = cwdValue[0];

  // Picking the folder is the moment we learn what this thing is, so it is the
  // moment to offer a command. Especially for a static site, which has no launch
  // command of its own and would otherwise leave you staring at a required field
  // with nothing to put in it.
  useEffect(() => {
    if (!cwd) return;
    let canceled = false;
    suggestRunCommand(cwd).then((command) => {
      if (canceled || !command) return;
      // The functional form lets us read the current value without depending on
      // it: we fill ONLY an empty field, so a command you typed (or one carried
      // in from a capture) is never overwritten.
      setRunValue((current) => (current.trim() === "" ? command : current));
    });
    return () => {
      canceled = true;
    };
  }, [cwd]);

  useEffect(() => {
    if (!cwd || !runValue.trim()) {
      setWarning(undefined);
      return;
    }

    // "canceled" avoids a classic React trap: if you change folder while a
    // check is still running, the OLD check's answer could land after the new
    // one and put a stale warning back on screen.
    let canceled = false;
    checkProjectFolder(cwd, runValue).then((w) => {
      if (!canceled) setWarning(w);
    });
    return () => {
      canceled = true;
    };
  }, [cwd, runValue]);

  async function handleSubmit(values: { port: string }) {
    // Read from state, not from the submitted values: every field here is
    // controlled because they feed each other, so state is the source of truth.
    const run = runValue.trim();
    const portRaw = values.port.trim();

    let valid = true;
    if (!cwd) {
      setCwdError("Pick a folder");
      valid = false;
    }
    if (!run) {
      setRunError("Required");
      valid = false;
    }

    // The port is optional, but when filled it must be a real port. Number("")
    // is 0, hence testing the string BEFORE converting.
    let port: number | undefined;
    if (portRaw) {
      const parsed = Number(portRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        setPortError("A number between 1 and 65535");
        valid = false;
      } else {
        port = parsed;
      }
    }

    if (!valid) return;

    try {
      const profiles = await readProfiles();

      // The picker may hand us a path through a symlink; stored profiles are
      // canonical (readProfiles resolves them), so the duplicate check below
      // must compare like with like — and saving the canonical form keeps every
      // later comparison exact too.
      const canonical = await canonicalCwd(cwd!);

      // Two profiles with the same folder AND the same declared port cannot be
      // told apart — matching between them would be arbitrary, so such a twin
      // has no possible use. This is the one save-time check that blocks: it
      // reports an impossibility, not a judgment call.
      const twin = profiles.some(
        (p) => p.id !== editingId && p.cwd === canonical && (p.port ?? null) === (port ?? null),
      );
      if (twin) {
        setPortError(
          port
            ? "Another profile already uses this folder and port — pick a different port to tell them apart."
            : "Another profile already uses this folder with no port — set a port to tell them apart.",
        );
        return;
      }

      // We rebuild the whole object rather than merging into the old one: that
      // is what lets you CLEAR a build or a port by emptying the field. A merge
      // would keep the previous value, so emptying a field would do nothing — a
      // baffling bug.
      // Absent port: we omit the key rather than store "". A missing field reads
      // as "not set"; an empty string reads as "set, to nothing", which is a lie.
      const saved: Profile = {
        id: editingId ?? randomUUID(),
        cwd: canonical,
        run,
        ...(port ? { port } : {}),
      };

      if (isEditing) {
        const index = profiles.findIndex((p) => p.id === editingId);
        // The profile may have been deleted meanwhile (by hand, other window):
        // better to say so than to resurrect it quietly.
        if (index === -1) throw new Error("This profile no longer exists.");
        profiles[index] = saved;
      } else {
        profiles.push(saved);
      }

      await writeProfiles(profiles);
      showToast({
        style: Toast.Style.Success,
        title: isEditing ? `Profile updated` : `Profile added`,
      });
      onSaved();
      pop();
    } catch (err) {
      // Typically: the existing file is corrupt, or permissions are missing.
      showToast({ style: Toast.Style.Failure, title: "Could not save", message: (err as Error).message });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Profile" : source ? "Duplicate Profile" : "New Profile"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Save"}
            icon={isEditing ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {/* The native macOS picker rather than a text field: a hand-typed path is
          a guaranteed typo and a broken profile with no legible error. */}
      <Form.FilePicker
        id="cwd"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={cwdValue}
        error={cwdError}
        onChange={(v) => {
          setCwdValue(v);
          setCwdError(undefined);
        }}
      />
      <Form.TextField
        id="run"
        title="Run command"
        placeholder="npm run dev"
        value={runValue}
        error={runError}
        onChange={(v) => {
          setRunValue(v);
          setRunError(undefined);
        }}
      />
      {/* The only prose left, and it earns its place: it reports a MISTAKE we
          can see (the folder cannot run this command), not a decision you made.
          A warning, not a block — you may have a good reason. */}
      {warning && <Form.Description title="⚠️ Heads up" text={warning} />}
      {/* 8080 rather than 5173: a placeholder should show the FORMAT, not name a
          framework's default. 5173 quietly said "we expect vite here". */}
      <Form.TextField
        id="port"
        title="Port"
        placeholder="8080 — optional"
        defaultValue={source?.port ? String(source.port) : undefined}
        error={portError}
        onChange={() => setPortError(undefined)}
      />
    </Form>
  );
}

export default function Command() {
  // push() rather than <Action.Push target={…}>: the draft has to be computed
  // (we read package.json to guess the run command) before the form can exist,
  // and target= needs its element up front.
  const { push } = useNavigation();
  const [ports, setPorts] = useState<ListeningPort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("mine");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // An unreadable file is NOT an empty list: we keep the error to show it,
  // rather than let you believe there are no profiles.
  const [profilesError, setProfilesError] = useState<string>();
  // Keyed by folder, not by profile: a profile and the orphan port it has not
  // claimed yet are the same project on disk, and deserve the same answer.
  const [stacks, setStacks] = useState<Map<string, string[]>>(new Map());
  // Profiles currently being launched, so the row can say so instead of looking
  // frozen while we wait for a port to appear.
  const [launching, setLaunching] = useState<Set<string>>(new Set());
  // Profiles that have a log on disk, i.e. were launched at least once. "Open
  // Log" only shows for these: offering to open a file that does not exist
  // would trade a hidden action for a broken one.
  const [launchedIds, setLaunchedIds] = useState<Set<string>>(new Set());

  // Internal to refresh, deliberately. It used to be called directly after a
  // save, which was wrong the moment refresh grew a second thing to compute:
  // `stacks` is derived from the profile list, so loading profiles WITHOUT
  // recomputing it left a freshly saved profile with no "Built with" tags until
  // the next manual ⌘R. Two ways to load the same state, one of them quietly
  // incomplete — everything that reloads goes through refresh now.
  //
  // Returns what it loaded as well as storing it: refresh needs the list right
  // away to know which folders to read, and reading it back from state would
  // hand us the previous render's value.
  const loadProfiles = useCallback(async (): Promise<Profile[]> => {
    try {
      const loaded = await readProfiles();
      setProfiles(loaded);
      setProfilesError(undefined);
      return loaded;
    } catch (err) {
      // We show the file path: without it, "Unexpected token }" doesn't tell you
      // WHERE to go and fix things.
      setProfiles([]);
      setProfilesError(`${(err as Error).message} — ${PROFILES_FILE}`);
      return [];
    }
  }, []);

  // The refresh currently in flight, if any. A ref rather than state: the
  // decisions below must see the CURRENT value, not the one from the render
  // they closed over. Two refreshes running at once would race their setState
  // calls and could land out of order — so at most one runs at a time.
  const inflight = useRef<Promise<void> | null>(null);

  // Is this view still open? The launch watcher outlives a slow build, and a
  // build can outlive the window you started it from. Its toast belongs to a
  // view that may be gone by then, so the loop asks before writing to it.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // spinner: manual refreshes (⌘R, after an action) show the loading bar — you
  // asked, we acknowledge. The background tick does not: a list that pulses
  // every three seconds reads as perpetually busy.
  //
  // The two callers also collide differently: a background tick that finds a
  // refresh already running just skips its beat (one read at a time is plenty),
  // but a manual refresh follows an action that CHANGED things — it must wait
  // its turn and then read again, or the kill you just did stays green until
  // the next tick.
  const refresh = useCallback(
    async ({ spinner = true } = {}) => {
      if (inflight.current) {
        if (!spinner) return;
        await inflight.current.catch(() => {});
      }

      const run = (async () => {
        if (spinner) setIsLoading(true);
        try {
          const [saved, listening, launched] = await Promise.all([
            loadProfiles(),
            readListeningPorts(),
            listLaunchedProfiles(),
          ]);
          setPorts(listening);
          setLaunchedIds(launched);

          // Read the stack once per distinct folder, here rather than during
          // render: rendering must stay synchronous, and the same project can
          // appear twice (as a profile and as the port it owns).
          const folders = new Set([
            ...saved.map((p) => p.cwd),
            ...listening.filter((p) => p.kind === "project" && p.cwd).map((p) => p.cwd!),
          ]);
          const entries = await Promise.all([...folders].map(async (f) => [f, await detectStack(f)] as const));
          setStacks(new Map(entries));
        } finally {
          if (spinner) setIsLoading(false);
        }
      })();

      inflight.current = run;
      try {
        await run;
      } finally {
        if (inflight.current === run) inflight.current = null;
      }
    },
    [loadProfiles],
  );

  // First load on mount, then a quiet tick: what listens changes under our feet
  // (you stop a server in a terminal, a build finishes), and a list of live
  // things that only updates when poked is a list that lies between pokes.
  useEffect(() => {
    refresh();
    const tick = setInterval(() => refresh({ spinner: false }), 3000);
    return () => clearInterval(tick);
  }, [refresh]);

  // An action on a toast, so the thing you wanted next is one key away instead
  // of a trip back to a row whose ⏎ has meanwhile become something else. These
  // used to be prose — "⌘L for the full log" — which named a shortcut the toast
  // could not press.
  const openLogAction = (profile: Profile): Toast.ActionOptions => ({
    title: "Open Log",
    shortcut: { modifiers: ["cmd"], key: "l" },
    onAction: () => open(logFileFor(profile.id)),
  });

  async function launch(profile: Profile) {
    setLaunching((s) => new Set(s).add(profile.id));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Launching ${displayPath(profile.cwd)}`,
      message: profile.run,
    });

    try {
      // The snapshot comes BEFORE the spawn: it is what lets the watcher tell a
      // listener this launch produced from a sibling that was already running
      // in the same folder. Without it, launching storybook next to a running
      // dev server would be declared a success by the dev server's port.
      const before = await readListeningPorts();
      const handle = await launchProfile(profile);

      // The log exists from here on — launchProfile opens it before spawning —
      // so the row may offer it now rather than after the first refresh. That is
      // what keeps ⏎ on Open Log while this launch runs, instead of falling
      // through to the edit form.
      setLaunchedIds((s) => new Set(s).add(profile.id));
      toast.primaryAction = openLogAction(profile);

      // A spinning toast claims WE are still working, and Raycast has no style
      // that says "we stopped looking". So we do not stop: watchLaunch bounds
      // one pass, and we keep taking passes for as long as this view is open.
      // The 90 seconds only ever existed to bound how long the toast may spin —
      // once the spinner stays honest, the bound has nothing left to protect.
      let outcome = await watchLaunch(profile, handle, before);
      while (outcome.kind === "still-working" && mounted.current) {
        toast.message = "Still working — alive, nothing listening yet. ⌘L to follow the log.";
        outcome = await watchLaunch(profile, handle, before);
      }
      // There is exactly one way to leave that loop without an answer: the view
      // closed under us. Its toast is not ours to write any more, and the server
      // carries on regardless — that is what detaching it was for.
      if (outcome.kind === "still-working") return;

      await refresh();

      // Two observed outcomes now reach here, and neither is a guess: it
      // listened, or it exited. "Still working" is no longer an answer we give —
      // it is a state we sit in, visibly, until one of the two happens.
      if (outcome.kind === "listening") {
        const url = `http://localhost:${outcome.listener.port}`;
        toast.style = Toast.Style.Success;
        toast.title = `${displayPath(profile.cwd)} is up`;
        toast.message = `Listening on port ${outcome.listener.port}`;
        // You launched a site to look at it. Offered, not done: a server is not
        // always something to open — an API, a database.
        toast.primaryAction = {
          title: "Open in Browser",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => open(url),
        };
        toast.secondaryAction = openLogAction(profile);
      } else {
        // It exited without ever listening: a definitive failure, caught the
        // instant it happened. And since we kept the output, we can show the
        // reason itself rather than send you looking for it.
        const lastLine = outcome.log.split("\n").filter(Boolean).pop();
        toast.style = Toast.Style.Failure;
        if (outcome.error !== undefined) {
          // It never even started (folder gone, shell missing): the spawn error
          // names the reason outright, which beats an exit code it never had.
          toast.title = "Could not launch";
          toast.message = outcome.error;
        } else {
          toast.title = `Exited${outcome.code !== null ? ` (code ${outcome.code})` : ""}`;
          toast.message = lastLine ?? "No output.";
        }
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not launch";
      toast.message = (err as Error).message;
    } finally {
      setLaunching((s) => {
        const next = new Set(s);
        next.delete(profile.id);
        return next;
      });
    }
  }

  // Kill, wait for it to be really gone, launch again — through the SAME gate as
  // any other signal. A profile is a folder and a command; restarting it is the
  // one thing it exists for, so this is not the "restart an undeclared process"
  // the scope refuses.
  //
  // No confirmation: the action says Restart and its outcome is the server back.
  // Kill asks because ⏎ was a hair trigger on a destructive verb; this is not.
  async function restart(profile: Profile, target: ListeningPort) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Restarting ${displayPath(profile.cwd)}…` });

    try {
      const sent = await killListener(target);

      // A refused signal means the row is not what we thought. Relaunching on
      // top of that would be building on a reading we just proved stale.
      // ("gone" is not a refusal: it was already down — someone killed it in a
      // terminal, or it crashed — and relaunching is exactly what was asked.)
      if (sent === "replaced" || sent === "unverified") {
        toast.hide();
        await showToast(noSignalToast(target, sent, "SIGTERM"));
        await refresh();
        return;
      }

      // No budget here either: the old port has to be free before the new
      // process claims it, and only the process knows when it is done draining.
      // A number would either interrupt an honest shutdown or make you wait on a
      // stuck one — see killProcess.
      while (sent === "signaled" && !(await waitForExit(target.pid, 1000)) && mounted.current) {
        toast.message = `Waiting for PID ${target.pid} to shut down — Kill Process offers SIGKILL if it is stuck.`;
      }
      if (!mounted.current) return;

      toast.hide();
      await launch(profile);
    } catch (error) {
      toast.hide();
      showToast({ style: Toast.Style.Failure, title: "Could not restart", message: (error as Error).message });
    }
  }

  // Your idea: capture a profile from something already running. The cwd and the
  // port are READ from the system, so they cannot be mistyped — this path makes
  // the wrong-folder mistake structurally impossible. Only the run command is a
  // guess, which is exactly why we open the prefilled form instead of saving:
  // the one field we inferred is the one you get to check.
  async function captureProfile(port: ListeningPort) {
    push(<ProfileForm source={await draftProfileFromPort(port, profiles)} onSaved={refresh} />);
  }

  async function deleteProfile(profile: Profile) {
    const confirmed = await confirmAlert({
      title: `Delete this profile?`,
      message: `${displayPath(profile.cwd)} — any running process is left untouched; only the profile goes away.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      // We re-read before writing rather than trust local state: the file may
      // have changed since (hand edit, another Raycast window).
      const current = await readProfiles();
      await writeProfiles(current.filter((p) => p.id !== profile.id));
      showToast({ style: Toast.Style.Success, title: "Profile deleted" });
      refresh();
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: "Could not delete", message: (err as Error).message });
    }
  }

  // What to tell the user when the gate refused to fire. Each refusal is a fact
  // we observed, and each gets its own words — collapsing them into one vague
  // "could not kill" would hide exactly the thing worth knowing.
  function noSignalToast(
    target: ListeningPort,
    why: "gone" | "replaced" | "unverified",
    signal: string,
  ): Toast.Options {
    switch (why) {
      case "gone":
        return {
          style: Toast.Style.Success,
          title: `${target.command} already exited`,
          message: `PID ${target.pid} is no longer running — ${signal} was not sent.`,
        };
      case "replaced":
        return {
          style: Toast.Style.Failure,
          title: "Not the same process anymore",
          message: `PID ${target.pid} now belongs to a different process — ${signal} was not sent. ⌘R to see what is running.`,
        };
      case "unverified":
        return {
          style: Toast.Style.Failure,
          title: `Could not verify PID ${target.pid}`,
          message: `Its start time could not be read, so ${signal} was not sent — ⌘R and try again.`,
        };
    }
  }

  // The row's PID was read at the last refresh, and a confirmation dialog can
  // sit open for minutes. killListener re-verifies at the instant of the signal
  // that the PID still belongs to the process whose start time the row carries
  // — so "Process N will receive SIGTERM" below is a promise the code keeps,
  // not a hope. A recycled or restarted PID fails that gate and nothing is sent.
  //
  // NO NUMBER DECIDES THAT A PROCESS REFUSES TO DIE
  //
  // This used to wait 2.5 seconds and then interrupt you with "it won't stop —
  // force it?". Measured: a server that honours SIGTERM and drains its
  // connections for 3 seconds got that dialog, and died 450 ms later while you
  // were reading it. Raising the number would only move the lie — 3 s and 8 s
  // are both honest shutdowns, and a `docker compose down` takes longer still.
  //
  // This project already deleted this exact timer once, from watchLaunch, and
  // wrote down why: a fixed budget has to guess how long work takes, and guesses
  // wrong in both directions. Kill had the same timer, in the other function.
  //
  // So nothing decides. We watch — for as long as this view is open, which is
  // what makes the spinner honest — and SIGKILL sits on the toast the whole
  // time, one keystroke away, for the only judge of "it is stuck" there is: you.
  async function killProcess(target: ListeningPort) {
    const confirmed = await confirmAlert({
      title: `Kill ${target.command} on port ${target.port}?`,
      message: `Process ${target.pid} will receive SIGTERM.`,
      primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    let forced = false;
    let refusal: "replaced" | "unverified" | undefined;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Stopping ${target.command}…`,
      message: `SIGTERM sent to PID ${target.pid}. Shutting down cleanly can take a moment.`,
      primaryAction: {
        // Available from the first second, and never pressed for you. It goes
        // through the same gate: by now the process may have finally exited, and
        // SIGKILL at a recycled PID is the worst thing this file could do.
        //
        // No custom shortcut: Raycast assigns toast actions its own key (⌘T for
        // the primary one) and ignores a shortcut set here. Setting ⌘K only
        // misled — ⌘K is Raycast's Actions panel, so the message told you to
        // press the one key that does something else. The prose names ⌘T, the
        // key Raycast actually shows on the toast.
        title: "Force Kill (SIGKILL)",
        onAction: async () => {
          forced = true;
          const sent = await killListener(target, { force: true });
          if (sent === "replaced" || sent === "unverified") refusal = sent;
        },
      },
    });

    try {
      const sent = await killListener(target);
      if (sent !== "signaled") {
        toast.hide();
        await showToast(noSignalToast(target, sent, "SIGTERM"));
        await refresh();
        return;
      }

      // SIGTERM is a request, not a result: redrawing the instant we sent it
      // would routinely show the process still alive and the row still green —
      // a stale answer presented as fresh. So we watch until it is actually
      // gone, however long that honestly takes.
      while (!(await waitForExit(target.pid, 1000)) && mounted.current && !refusal) {
        toast.message = `Still shutting down — ⌘T to force it.`;
      }
      if (!mounted.current) return; // the view closed; its toast is not ours

      if (refusal) {
        toast.hide();
        await showToast(noSignalToast(target, refusal, "SIGKILL"));
        await refresh();
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = `${target.command} (PID ${target.pid}) ${forced ? "killed" : "stopped"}`;
      toast.message = forced ? "SIGKILL — it got no chance to clean up." : undefined;
      await refresh();
    } catch (error) {
      toast.hide();
      showToast({ style: Toast.Style.Failure, title: "Could not kill", message: (error as Error).message });
    }
  }

  // The combined view: every listener a profile claims is absorbed into that
  // profile's row, so a running server appears once — as your profile, not as an
  // anonymous port. What is left over is genuinely untracked.
  const { matches, orphans } = matchProfiles(profiles, ports);

  // The default filter hides system noise, but the dropdown keeps that state
  // permanently visible: a list that hides rows without saying so is a list you
  // stop trusting.
  // Containers stay visible under "My servers": we don't know what is behind
  // them, so we don't decide to hide them for you.
  const visible = scope === "all" ? orphans : orphans.filter((p) => p.kind !== "system");
  const hiddenCount = orphans.length - visible.length;

  // The form is reachable everywhere, including from an empty list — that is
  // precisely when you most need to add a first profile.
  const addAction = (
    <Action.Push
      title="Add Profile"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ProfileForm onSaved={refresh} />}
    />
  );
  const refreshAction = (
    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} shortcut={Keyboard.Shortcut.Common.Refresh} />
  );

  const isEmpty = !profilesError && profiles.length === 0 && visible.length === 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isEmpty}
      actions={<ActionPanel>{addAction}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" value={scope} onChange={(v) => setScope(v as Scope)}>
          <List.Dropdown.Item title="My servers" value="mine" />
          <List.Dropdown.Item title="Everything (incl. system)" value="all" />
        </List.Dropdown>
      }
    >
      {isEmpty && !isLoading && (
        <List.EmptyView
          icon={Icon.Plug}
          title={scope === "mine" ? "No project server" : "Nothing listening locally"}
          description={
            scope === "mine" && hiddenCount > 0
              ? `${hiddenCount} system process${hiddenCount > 1 ? "es" : ""} hidden — switch to “Everything” to see them. ⌘N to declare a profile.`
              : "⌘N to declare a launchable profile."
          }
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      )}

      {/* An unreadable file takes a loud row rather than a silence: without this,
          one stray comma would make every profile vanish without a word. */}
      {profilesError && (
        <List.Item
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Profiles unreadable"
          subtitle={profilesError}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Error" text={profilesError} />
                  <List.Item.Detail.Metadata.Label title="File" text={PROFILES_FILE} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="What to do" text="Fix the JSON, then ⌘R." />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.ShowInFinder title="Open Folder" path={PROFILES_DIR} />
              {refreshAction}
            </ActionPanel>
          }
        />
      )}

      <List.Section title="Declared profiles" subtitle={profiles.length ? String(profiles.length) : undefined}>
        {profiles.map((p) => {
          const m = matches.get(p.id);
          const running = m?.status === "running";
          const isLaunching = launching.has(p.id);
          const livePort = m?.listener?.port;

          return (
            <List.Item
              key={p.id}
              // The dot carries the state at a glance: green = up, grey = down.
              // Color does the work the eye already does when scanning a list.
              icon={{
                source: isLaunching ? Icon.CircleProgress : running ? Icon.CircleFilled : Icon.Circle,
                tintColor: running ? Color.Green : isLaunching ? Color.Yellow : Color.SecondaryText,
              }}
              // The path IS the title. There is no name to show because there is
              // no name: `~/Projects/cv-machine/v00/site` distinguishes itself
              // from its siblings, which is all a label ever had to do.
              title={displayPath(p.cwd)}
              subtitle={isLaunching ? "starting…" : running ? `port ${livePort}` : undefined}
              // Raycast searches title, subtitle and keywords — nothing else. So
              // "5173" found a running profile (its subtitle) and never a
              // stopped one, whose declared port sits in the detail pane.
              keywords={profileKeywords(p, m)}
              accessories={[
                ...(m?.portTakenBy
                  ? [
                      {
                        tag: { value: `${p.port} busy`, color: Color.Red },
                        tooltip: "Declared port taken by another process",
                      },
                    ]
                  : []),
                // Bound to every interface: anyone on the same network can
                // reach it. Worth a flag on a machine that leaves the house.
                ...(running && isExposed(m!.listener!.address)
                  ? [
                      {
                        tag: { value: "LAN", color: Color.Orange },
                        tooltip: "Bound to all interfaces — reachable from your network, not just this machine",
                      },
                    ]
                  : []),
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={isLaunching ? "Starting…" : running ? "Running" : "Stopped"}
                          color={running ? Color.Green : isLaunching ? Color.Yellow : Color.SecondaryText}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      {/* Only when we actually recognized something: an empty
                          row would state that we know nothing, which is not
                          worth a line. */}
                      {(stacks.get(p.cwd)?.length ?? 0) > 0 && (
                        <List.Item.Detail.Metadata.TagList title="Built with">
                          {stacks.get(p.cwd)!.map((s) => (
                            <List.Item.Detail.Metadata.TagList.Item key={s} text={s} color={stackColor(s)} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      {/* Identity: what this profile IS. The title is the path
                          shortened; this is the full one, worth having to copy
                          or verify. */}
                      <List.Item.Detail.Metadata.Label title="Folder" text={p.cwd} />
                      <List.Item.Detail.Metadata.Separator />
                      {/* What you declared. The port earns a line only when it
                          does its one job — telling two profiles in a folder
                          apart. No port, no line: a dash saying "nothing here"
                          is the dump we are clearing out. */}
                      <List.Item.Detail.Metadata.Label title="Run" text={p.run} />
                      {p.port && <List.Item.Detail.Metadata.Label title="Profile port" text={String(p.port)} />}
                      {m?.portTakenBy && (
                        <List.Item.Detail.Metadata.Label
                          title="⚠️ Port busy"
                          text={`Held by ${m.portTakenBy.command} (PID ${m.portTakenBy.pid}) — ${m.portTakenBy.cwd ?? "unknown folder"}`}
                        />
                      )}
                      {/* What is true right now. Only exists while it runs, so
                          the separator draws the line between what you declared
                          (Profile port) and what it is on (Port). Address is gone:
                          for a localhost server it is either the silent default or
                          exposure, and the LAN accessory already flags the one
                          that matters. PID sits at the bottom, kept off Port's
                          shoulder — two adjacent number rows both starting with P
                          read as one. */}
                      {running && <List.Item.Detail.Metadata.Separator />}
                      {running && <List.Item.Detail.Metadata.Label title="Port" text={String(livePort)} />}
                      {running && startedBy(m!.listener!, profiles) && (
                        <List.Item.Detail.Metadata.Label title="Started by" text={startedBy(m!.listener!, profiles)!} />
                      )}
                      {running && <List.Item.Detail.Metadata.Label title="PID" text={m!.listener!.pid} />}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {/* ⏎ is whatever this row is for, in each of its THREE states.
                      There used to be two here, and the third — mid-launch —
                      fell through every condition and landed on the edit form:
                      you pressed Enter to start a server and got a settings
                      panel. Enumerate all three, or say nothing.

                      Stopped  -> start it.
                      Starting -> watch it. Never a form, never anything
                                  destructive: this state lasts exactly as long
                                  as a reflex second Enter.
                      Running  -> open it. You launched a site to look at it, so
                                  killing it is not the obvious next keystroke —
                                  it moves down, and keeps an explicit shortcut. */}
                  {!running && !isLaunching && <Action title="Launch" icon={Icon.Play} onAction={() => launch(p)} />}
                  {running && livePort && (
                    <Action.OpenInBrowser title="Open in Browser" url={`http://localhost:${livePort}`} />
                  )}
                  {isLaunching && launchedIds.has(p.id) && (
                    <Action.Open
                      title="Open Log"
                      icon={Icon.Text}
                      target={logFileFor(p.id)}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                  )}
                  {running && (
                    <Action
                      title="Restart"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={() => restart(p, m!.listener!)}
                    />
                  )}
                  {running && livePort && (
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={`http://localhost:${livePort}`}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  )}
                  {running && (
                    <Action
                      title="Kill Process"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "k" }}
                      onAction={() => killProcess(m!.listener!)}
                    />
                  )}
                  <Action.Push
                    title="Edit Profile"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<ProfileForm source={p} editingId={p.id} onSaved={refresh} />}
                  />
                  <Action.Push
                    title="Duplicate Profile"
                    icon={Icon.Duplicate}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    // No editingId: we fall back to creation. The port is
                    // dropped from the copy — carrying it over would open the
                    // form on the one combination the duplicate check rejects,
                    // and the whole point of a second profile in the same
                    // folder is to differ on it.
                    target={<ProfileForm source={{ ...p, port: undefined }} onSaved={refresh} />}
                  />
                  {launchedIds.has(p.id) && !isLaunching && (
                    <Action.Open
                      title="Open Log"
                      icon={Icon.Text}
                      target={logFileFor(p.id)}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                  )}
                  {addAction}
                  <Action.ShowInFinder title="Open Folder" path={p.cwd} />
                  <Action
                    title="Delete Profile"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteProfile(p)}
                  />
                  {refreshAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Untracked ports" subtitle={visible.length ? String(visible.length) : undefined}>
        {visible.map((p) => (
          <List.Item
            key={`${p.pid}-${p.port}`}
            // The folder IS the label — the same decision profiles made, which
            // these rows never got. We know the cwd (it is what matching runs
            // on), so "Port 3000 / node" was withholding the one thing that says
            // what this is. A container's cwd belongs to the runtime and a
            // daemon has none, so those keep the port as their name: there is
            // nothing better to say about them.
            title={p.cwd && p.kind === "project" ? displayPath(p.cwd) : `Port ${p.port}`}
            subtitle={p.cwd && p.kind === "project" ? `port ${p.port} · ${p.command}` : p.command}
            keywords={listenerKeywords(p)}
            accessories={
              isExposed(p.address)
                ? [
                    {
                      tag: { value: "LAN", color: Color.Orange },
                      tooltip: "Bound to all interfaces — reachable from your network, not just this machine",
                    },
                  ]
                : []
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {/* Identity first: what this is, before what it is doing.
                        For a container the cwd belongs to the runtime, not the
                        project, so printing the raw path would be a lie. */}
                    <List.Item.Detail.Metadata.Label
                      title="Folder"
                      // A container's cwd belongs to the runtime, and a daemon's
                      // is "/" — launchd's, saying nothing about the daemon. Both
                      // get a dash rather than a path that would only mislead.
                      text={
                        p.kind === "container"
                          ? "Inside a container — not visible from the host"
                          : p.cwd && p.cwd !== "/"
                            ? p.cwd
                            : "—"
                      }
                    />
                    {/* Knowing it is a React app before you capture it is the point. */}
                    {(stacks.get(p.cwd ?? "")?.length ?? 0) > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Built with">
                        {stacks.get(p.cwd!)!.map((s) => (
                          <List.Item.Detail.Metadata.TagList.Item key={s} text={s} color={stackColor(s)} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.TagList title="Type">
                      <List.Item.Detail.Metadata.TagList.Item text={KIND_LABEL[p.kind]} color={KIND_COLOR[p.kind]} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    {/* The live facts. "Process" is gone — the short name is
                        already in the subtitle, and the full command line below
                        is the one worth a line. Address is gone too: the LAN
                        accessory carries the only reading that matters. PID is
                        last, kept off Port's shoulder — two adjacent number rows
                        both starting with P read as one. */}
                    <List.Item.Detail.Metadata.Label title="Port" text={p.port} />
                    {p.fullCommand && <List.Item.Detail.Metadata.Label title="Command" text={p.fullCommand} />}
                    {startedBy(p, profiles) && (
                      <List.Item.Detail.Metadata.Label title="Started by" text={startedBy(p, profiles)!} />
                    )}
                    <List.Item.Detail.Metadata.Label title="PID" text={p.pid} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {/* Only offered when we actually know the folder. For a system
                    daemon or a container the cwd is "/" or hidden, so there is
                    nothing honest to prefill — the action simply isn't there. */}
                {p.kind === "project" && p.cwd && (
                  <Action
                    title="Create Profile from This"
                    icon={Icon.PlusCircle}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={() => captureProfile(p)}
                  />
                )}
                <Action.OpenInBrowser title="Open in Browser" url={`http://localhost:${p.port}`} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={`http://localhost:${p.port}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Kill Process"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "k" }}
                  onAction={() => killProcess(p)}
                />
                {addAction}
                {refreshAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
