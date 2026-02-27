import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { checkDeps, brewInstall, installHomebrew, DepsStatus } from "./utils";

interface StepStatus {
  state: "idle" | "running" | "done" | "error" | "skipped";
  log: string;
}

interface Steps {
  brew: StepStatus;
  ytdlp: StepStatus;
  ffmpeg: StepStatus;
}

const IDLE: StepStatus = { state: "idle", log: "" };

function stepIcon(s: StepStatus): { source: Icon; tintColor: Color } {
  switch (s.state) {
    case "done":
    case "skipped":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "running":
      return { source: Icon.CircleProgress50, tintColor: Color.Blue };
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function stepSubtitle(s: StepStatus): string {
  if (s.state === "running") return s.log || "Working…";
  if (s.state === "done") return "Installed ✓";
  if (s.state === "skipped") return "Already installed";
  if (s.state === "error") return `Failed — ${s.log}`;
  return "Waiting";
}

export default function Setup() {
  const [deps, setDeps] = useState<DepsStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const [steps, setSteps] = useState<Steps>({
    brew: IDLE,
    ytdlp: IDLE,
    ffmpeg: IDLE,
  });

  const upd = (key: keyof Steps, patch: Partial<StepStatus>) =>
    setSteps((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  useEffect(() => {
    checkDeps().then(setDeps);
  }, []);

  async function installAll() {
    setInstalling(true);
    setSteps({ brew: IDLE, ytdlp: IDLE, ffmpeg: IDLE });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing dependencies…",
    });

    try {
      // ── Homebrew ──
      const freshDeps = await checkDeps();

      if (freshDeps.brew) {
        upd("brew", { state: "skipped", log: "" });
      } else {
        upd("brew", { state: "running", log: "Installing Homebrew…" });
        toast.message = "Installing Homebrew…";
        try {
          await installHomebrew((line) => upd("brew", { log: line }));
          upd("brew", { state: "done" });
        } catch (e) {
          upd("brew", { state: "error", log: String(e) });
          toast.style = Toast.Style.Failure;
          toast.title = "Homebrew install failed";
          toast.message =
            'Try: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
          setInstalling(false);
          return;
        }
      }

      // ── yt-dlp ──
      if (freshDeps.ytdlp) {
        upd("ytdlp", { state: "skipped" });
      } else {
        upd("ytdlp", { state: "running", log: "Installing yt-dlp…" });
        toast.message = "Installing yt-dlp…";
        try {
          await brewInstall("yt-dlp", (line) => upd("ytdlp", { log: line }));
          upd("ytdlp", { state: "done" });
        } catch (e) {
          upd("ytdlp", { state: "error", log: String(e) });
          toast.style = Toast.Style.Failure;
          toast.title = "yt-dlp install failed";
          toast.message = "Run: brew install yt-dlp";
          setInstalling(false);
          return;
        }
      }

      // ── ffmpeg ──
      if (freshDeps.ffmpeg) {
        upd("ffmpeg", { state: "skipped" });
      } else {
        upd("ffmpeg", {
          state: "running",
          log: "Installing ffmpeg (takes a minute)…",
        });
        toast.message = "Installing ffmpeg…";
        try {
          await brewInstall("ffmpeg", (line) => upd("ffmpeg", { log: line }));
          upd("ffmpeg", { state: "done" });
        } catch (e) {
          upd("ffmpeg", { state: "error", log: String(e) });
          toast.style = Toast.Style.Failure;
          toast.title = "ffmpeg install failed";
          toast.message = "Run: brew install ffmpeg";
          setInstalling(false);
          return;
        }
      }

      toast.style = Toast.Style.Success;
      toast.title = "All done!";
      toast.message = "clipity is ready to use";
      setDeps(await checkDeps());
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = String(e);
    }

    setInstalling(false);
  }

  async function installSingle(pkg: "yt-dlp" | "ffmpeg") {
    const key = pkg === "yt-dlp" ? "ytdlp" : "ffmpeg";
    setInstalling(true);
    upd(key, { state: "running", log: `Installing ${pkg}…` });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${pkg}…`,
      message: "This may take a moment",
    });

    try {
      await brewInstall(pkg, (line) => {
        upd(key, { log: line });
        toast.message = line.slice(0, 80);
      });
      upd(key, { state: "done" });
      toast.style = Toast.Style.Success;
      toast.title = `${pkg} installed!`;
      toast.message = "";
      setDeps(await checkDeps());
    } catch (e) {
      upd(key, { state: "error", log: String(e) });
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${pkg}`;
      toast.message = `Run manually: brew install ${pkg}`;
    }

    setInstalling(false);
  }

  if (!deps) {
    return <List isLoading />;
  }

  const allGood = deps.ytdlp && deps.ffmpeg;

  return (
    <List navigationTitle="clipity. — Setup">
      {/* Status section */}
      <List.Section title="Dependencies">
        <List.Item
          icon={stepIcon(
            deps.brew
              ? { state: "done", log: "" }
              : steps.brew.state !== "idle"
                ? steps.brew
                : { state: "idle", log: "" },
          )}
          title="Homebrew"
          subtitle={deps.brew ? "Already installed" : stepSubtitle(steps.brew)}
          accessories={[{ text: deps.brew ? deps.brewPath || "" : "Required" }]}
          actions={
            !deps.brew ? (
              <ActionPanel>
                <Action
                  title="Install Homebrew"
                  icon={Icon.Download}
                  onAction={installAll}
                />
                <Action.OpenInBrowser
                  title="Open Homebrew Website"
                  url="https://brew.sh"
                />
              </ActionPanel>
            ) : undefined
          }
        />

        <List.Item
          icon={stepIcon(
            deps.ytdlp
              ? { state: "done", log: "" }
              : steps.ytdlp.state !== "idle"
                ? steps.ytdlp
                : { state: "idle", log: "" },
          )}
          title="yt-dlp"
          subtitle={
            deps.ytdlp
              ? "Already installed"
              : installing && steps.ytdlp.state === "running"
                ? steps.ytdlp.log
                : "Downloads videos from 1000+ sites"
          }
          accessories={[{ text: deps.ytdlp ? "✓" : "Missing" }]}
          actions={
            !deps.ytdlp ? (
              <ActionPanel>
                <Action
                  title="Install Yt-dlp"
                  icon={Icon.Download}
                  onAction={() => installSingle("yt-dlp")}
                />
                <Action
                  title="Install Everything"
                  icon={Icon.Download}
                  onAction={installAll}
                />
              </ActionPanel>
            ) : undefined
          }
        />

        <List.Item
          icon={stepIcon(
            deps.ffmpeg
              ? { state: "done", log: "" }
              : steps.ffmpeg.state !== "idle"
                ? steps.ffmpeg
                : { state: "idle", log: "" },
          )}
          title="ffmpeg"
          subtitle={
            deps.ffmpeg
              ? "Already installed"
              : installing && steps.ffmpeg.state === "running"
                ? steps.ffmpeg.log
                : "Handles video trimming & conversion"
          }
          accessories={[{ text: deps.ffmpeg ? "✓" : "Missing" }]}
          actions={
            !deps.ffmpeg ? (
              <ActionPanel>
                <Action
                  title="Install Ffmpeg"
                  icon={Icon.Download}
                  onAction={() => installSingle("ffmpeg")}
                />
                <Action
                  title="Install Everything"
                  icon={Icon.Download}
                  onAction={installAll}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      </List.Section>

      {/* Actions section */}
      <List.Section title={allGood ? "All set!" : "Actions"}>
        {!allGood && (
          <List.Item
            icon={{ source: Icon.Download, tintColor: Color.Blue }}
            title="Install Everything"
            subtitle="Installs Homebrew, yt-dlp and ffmpeg automatically"
            actions={
              <ActionPanel>
                <Action
                  title="Install All Dependencies"
                  icon={Icon.Download}
                  onAction={installAll}
                />
              </ActionPanel>
            }
          />
        )}

        {allGood && (
          <List.Item
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            title="Ready to use!"
            subtitle="Open the Download Video command to get started"
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open Download Command"
                  target="raycast://extensions/deanfyi/clipity/download"
                />
              </ActionPanel>
            }
          />
        )}

        <List.Item
          icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
          title="Manual install"
          subtitle="brew install yt-dlp ffmpeg"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Command"
                content="brew install yt-dlp ffmpeg"
              />
              <Action.Open title="Open Terminal" target="terminal://" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
