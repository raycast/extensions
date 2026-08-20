import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import {
  daemonIsUp,
  findDocker,
  imageIsPresent,
  readPullProgress,
  removeStoppedContainer,
  startContainer,
  startPull,
} from "./detector/docker";
import { loopbackPort } from "./detector/endpoint";
import { type RawPreferences, toSettings } from "./preferences";

const HEALTH_TIMEOUT_MS = 2000;
const READY_ATTEMPTS = 30;
const POLL_MS = 1000;
const BAR_WIDTH = 20;
const IMAGE_SIZE = "1.3 GB";

type Key = "runtime" | "image" | "container";
type State = "waiting" | "busy" | "ok" | "fail";

interface Check {
  readonly key: Key;
  readonly title: string;
  readonly state: State;
  readonly status: string;
  readonly body: string;
  readonly facts: readonly (readonly [string, string])[];
}

const TITLES: Record<Key, string> = {
  runtime: "Container runtime",
  image: "Detector image",
  container: "Detector",
};

const RUNTIMES = "Docker Desktop, OrbStack, Rancher Desktop and colima";
const AGAIN = "then run this command again";
const DEGRADED =
  "Caviarde keeps masking patterns without it: email addresses, phone numbers, IBANs, cards and keys.";

const TEXT = {
  checking: "Checking.",
  runtimeReady: "Ready to run the detector.",
  runtimeMissing: `No container runtime is installed. ${RUNTIMES} were checked.\n\nInstall one, ${AGAIN}.`,
  runtimeStopped: `The container runtime is installed but not responding.\n\nStart it, ${AGAIN}.`,
  imageUncheckable:
    "The image cannot be checked until the container runtime is running.",
  imageReady: "The pinned image is on disk.",
  imagePreparing: "Preparing the download.",
  imageForeign:
    "The pinned image is not on disk, so the detector answering on this address is a different one.",
  imageAbsent:
    "The pinned image is not on disk, and there is no local detector for this command to start it for.",
  detectorStarting:
    "Starting the container. The model takes a few seconds to load.",
  detectorReady:
    "The semantic layer is active. The container restarts whenever the runtime does.",
  detectorForeign:
    "A detector is already running on this address, so nothing was restarted.",
  detectorNeedsRuntime: `The detector needs a container runtime.\n\n${DEGRADED}`,
  detectorRemote: `The Detector URL does not point at this machine, so this command cannot start or manage it. Point it back at loopback, or start that detector yourself.\n\n${DEGRADED}`,
  detectorNeedsImage: `The detector cannot start until the image is downloaded.\n\n${DEGRADED}`,
  detectorRefused: `The container could not start and nothing is answering on this address. The port is most likely in use.\n\n${DEGRADED}`,
  detectorSilent:
    "The container started but has not answered within a minute.\n\nRun this command again in a moment.",
} as const;

const DOWNLOAD_FAILED = (reason: string) =>
  `The download failed. Docker reported:\n\n> ${reason}\n\nResolve it, ${AGAIN}.`;
const CONTINUES = "The download continues if this window is closed.";

const INITIAL: Check[] = (["runtime", "image", "container"] as const).map(
  (key) => ({
    key,
    title: TITLES[key],
    state: "waiting",
    status: "Checking",
    body: TEXT.checking,
    facts: [],
  }),
);

const COLOURS: Record<State, Color> = {
  waiting: Color.SecondaryText,
  busy: Color.Yellow,
  ok: Color.Green,
  fail: Color.Red,
};

const ICONS: Record<State, Icon> = {
  waiting: Icon.Circle,
  busy: Icon.CircleProgress50,
  ok: Icon.CheckCircle,
  fail: Icon.XMarkCircle,
};

/** Rules rather than blocks: Raycast has no block glyphs in its code font and
 * pulls them from a fallback whose heights do not line up. */
function bar(done: number, total: number): string {
  const filled = total > 0 ? Math.round((done / total) * BAR_WIDTH) : 0;
  return `\`${"━".repeat(filled)}${"─".repeat(BAR_WIDTH - filled)}\``;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function detectorAnswers(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

type Patch = Partial<Omit<Check, "key" | "title">>;
type Update = (key: Key, patch: Patch) => void;

/** Downloads the image, reporting progress, and answers whether it landed. */
async function pullImage(
  docker: string,
  update: Update,
  logPath: string,
): Promise<boolean> {
  const inFlight = readPullProgress(logPath);
  // A pull left running by an earlier window is followed rather than restarted.
  if (inFlight === null || inFlight.finished || inFlight.error !== null)
    startPull(docker, logPath);

  for (;;) {
    const progress = readPullProgress(logPath);

    if (progress?.error != null) {
      update("image", {
        state: "fail",
        status: "Download failed",
        body: DOWNLOAD_FAILED(progress.error),
      });
      return false;
    }

    if (progress?.finished === true || (await imageIsPresent(docker)))
      return true;

    const layers = progress?.layers ?? 0;
    const done = progress?.done ?? 0;
    const percent = layers === 0 ? 0 : Math.round((done / layers) * 100);
    update("image", {
      state: "busy",
      // The accessory column is narrow, and anything longer is ellipsised.
      status: layers === 0 ? "Starting" : `${percent}%`,
      body:
        layers === 0
          ? `${TEXT.imagePreparing}\n\n${CONTINUES}`
          : `${bar(done, layers)}  **${percent}%**\n\n${CONTINUES}`,
      facts: [
        ["Layers", layers === 0 ? "Counting" : `${done} of ${layers}`],
        ["Size", IMAGE_SIZE],
      ],
    });
    await sleep(POLL_MS);
  }
}

async function run(update: Update, finish: () => void): Promise<void> {
  const url = toSettings(getPreferenceValues<RawPreferences>()).detectorUrl;
  const alreadyUp = await detectorAnswers(url);
  const port = loopbackPort(url);
  const address: [string, string] = ["Address", url];

  const detectorFacts: [string, string][] = [
    address,
    ["Access", "Loopback only"],
  ];

  const docker = findDocker();
  if (docker === null) {
    update("runtime", {
      state: "fail",
      status: "Not found",
      body: TEXT.runtimeMissing,
    });
    update("image", {
      state: "waiting",
      status: "Unknown",
      body: TEXT.imageUncheckable,
    });
    update("container", {
      state: alreadyUp ? "ok" : "fail",
      status: alreadyUp ? "Running" : "Not running",
      body: alreadyUp ? TEXT.detectorForeign : TEXT.detectorNeedsRuntime,
      facts: detectorFacts,
    });
    finish();
    return;
  }

  const runtime: [string, string] = ["Binary", docker];
  if (!(await daemonIsUp(docker))) {
    update("runtime", {
      state: "fail",
      status: "Not running",
      body: TEXT.runtimeStopped,
      facts: [runtime],
    });
    update("image", {
      state: "waiting",
      status: "Unknown",
      body: TEXT.imageUncheckable,
    });
    update("container", {
      state: alreadyUp ? "ok" : "fail",
      status: alreadyUp ? "Running" : "Not running",
      body: alreadyUp ? TEXT.detectorForeign : TEXT.detectorNeedsRuntime,
      facts: detectorFacts,
    });
    finish();
    return;
  }
  update("runtime", {
    state: "ok",
    status: "Running",
    body: TEXT.runtimeReady,
    facts: [runtime],
  });

  const imageReady: Patch = {
    state: "ok",
    status: "On disk",
    body: TEXT.imageReady,
    facts: [["Size", IMAGE_SIZE]],
  };

  let onDisk = await imageIsPresent(docker);
  if (onDisk) {
    update("image", imageReady);
  } else if (alreadyUp) {
    // Something else is serving the port, so downloading would fix nothing.
    update("image", {
      state: "fail",
      status: "Not on disk",
      body: TEXT.imageForeign,
    });
  } else if (port === null) {
    update("image", {
      state: "waiting",
      status: "Not on disk",
      body: TEXT.imageAbsent,
    });
  } else {
    const logPath = join(environment.supportPath, "pull.log");
    onDisk = await pullImage(docker, update, logPath);
    if (!onDisk) {
      update("container", {
        state: "fail",
        status: "Not running",
        body: TEXT.detectorNeedsImage,
        facts: detectorFacts,
      });
      finish();
      return;
    }
    update("image", imageReady);
  }

  if (alreadyUp) {
    update("container", {
      state: "ok",
      status: "Running",
      body: TEXT.detectorForeign,
      facts: detectorFacts,
    });
    finish();
    return;
  }

  if (port === null) {
    update("container", {
      state: "fail",
      status: "Not running",
      body: TEXT.detectorRemote,
      facts: [address],
    });
    finish();
    return;
  }

  update("container", {
    state: "busy",
    status: "Starting",
    body: TEXT.detectorStarting,
    facts: detectorFacts,
  });
  await removeStoppedContainer(docker);

  let refused = false;
  try {
    await startContainer(
      docker,
      join(environment.assetsPath, "detector-patch", "gliner_layer.py"),
      port,
    );
  } catch {
    refused = true;
  }

  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    if (await detectorAnswers(url)) {
      update("container", {
        state: "ok",
        status: "Running",
        body: TEXT.detectorReady,
        facts: detectorFacts,
      });
      finish();
      return;
    }
    // A refused start is only reported once the port has had a chance to
    // answer: something else may already be serving a detector there.
    if (refused && attempt >= 2) break;
    await sleep(2000);
  }

  update("container", {
    state: "fail",
    status: "Not running",
    body: refused ? TEXT.detectorRefused : TEXT.detectorSilent,
    facts: detectorFacts,
  });
  finish();
}

export default function SetUpDetector() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [selected, setSelected] = useState<string>("runtime");
  const [working, setWorking] = useState(true);
  const started = useRef(false);
  const followed = useRef<Key | null>(null);

  useEffect(() => {
    // React runs effects twice in development. Two concurrent runs race over
    // the same container name, and the loser reports a failure the winner has
    // already recovered from.
    if (started.current) return;
    started.current = true;

    const update: Update = (key, patch) => {
      setChecks((current) =>
        current.map((check) =>
          check.key === key ? { ...check, ...patch } : check,
        ),
      );
      // Only on a change of step: a download updates every second, and moving
      // the selection back would fight anyone reading another row.
      if (followed.current !== key) {
        followed.current = key;
        setSelected(key);
      }
    };

    void run(update, () => setWorking(false));
  }, []);

  return (
    <List
      isLoading={working}
      isShowingDetail
      navigationTitle="Set up Detector"
      searchBarPlaceholder="Setting up the detector"
      selectedItemId={selected}
      onSelectionChange={(id) => {
        if (id !== null) setSelected(id);
      }}
    >
      {checks.map((check) => (
        <List.Item
          key={check.key}
          id={check.key}
          icon={{ source: ICONS[check.state], tintColor: COLOURS[check.state] }}
          title={check.title}
          accessories={[{ text: check.status }]}
          detail={
            <List.Item.Detail
              markdown={`## ${check.title}\n\n${check.body}`}
              metadata={
                check.facts.length === 0 ? undefined : (
                  <List.Item.Detail.Metadata>
                    {check.facts.map(([label, value]) => (
                      <List.Item.Detail.Metadata.Label
                        key={label}
                        title={label}
                        text={value}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                )
              }
            />
          }
        />
      ))}
    </List>
  );
}
