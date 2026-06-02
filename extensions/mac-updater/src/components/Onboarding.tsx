import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { markOnboarded } from "../utils/onboarding-store";
import { installMas, isMasInstalled } from "../utils/sources/mas";

interface OnboardingProps {
  onDone: () => void;
}

const STEPS = ["welcome", "setup"] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding({ onDone }: OnboardingProps) {
  const { pop } = useNavigation();
  const [step, setStep] = useState<Step>("welcome");
  const [masInstalled, setMasInstalled] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // isMasInstalled checks both the Apple-Silicon and Intel brew prefixes
    // (plus PATH), so onboarding detects mas correctly on either architecture.
    isMasInstalled().then(setMasInstalled);
  }, []);

  async function finish() {
    await markOnboarded();
    onDone();
    pop();
  }

  async function installMasNow() {
    setInstalling(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing mas via Homebrew…",
    });
    const r = await installMas();
    setInstalling(false);
    if (r.success) {
      toast.style = Toast.Style.Success;
      toast.title = "mas installed";
      setMasInstalled(true);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't install mas";
      toast.message = r.error;
    }
  }

  const markdown = (() => {
    switch (step) {
      case "welcome":
        return `# Mac Updater

A single place to keep every app and package on your Mac current.

It checks Homebrew, the App Store, Sparkle apps, Electron apps, GitHub releases, and your CLI packages — all at once. Updates run in place, never silent unless you ask.

`;

      case "setup": {
        const masStatus =
          masInstalled === null
            ? "Checking…"
            : masInstalled
              ? "Already installed"
              : "Not yet installed";
        const masNeeded = masInstalled === false && !installing;
        return `# Optional setup

**Mac App Store updates** need the \`mas\` command-line tool. _Status: ${masStatus}._

${masNeeded ? "Hit the button below to install it via Homebrew." : ""}

---

**Background auto-update** is off by default. To turn it on, right-click _Auto-Update in Background_ in Raycast → Configure Command → Preferences.

---

**A few shortcuts you'll use a lot:**

- \`⌘⇧U\` — Update everything
- \`⌘⇧A\` — Adopt apps to Homebrew
- \`⌘R\` — Refresh
- \`Space\` — Select an app for batch update

You can reopen this guide anytime from the actions menu.`;
      }
    }
  })();

  const isLast = step === STEPS[STEPS.length - 1];
  const stepNum = STEPS.indexOf(step) + 1;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Welcome · ${stepNum} of ${STEPS.length}`}
      actions={
        <ActionPanel>
          {isLast ? (
            <Action
              title="Get Started"
              icon={Icon.ArrowRight}
              onAction={finish}
            />
          ) : (
            <Action
              title="Continue"
              icon={Icon.ArrowRight}
              onAction={() => setStep("setup")}
            />
          )}

          {step === "setup" && masInstalled === false && !installing && (
            <Action
              title="Install Mas Now"
              icon={Icon.Download}
              onAction={installMasNow}
            />
          )}

          {step === "setup" && (
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              onAction={() => setStep("welcome")}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
          )}
          <ActionPanel.Section>
            <Action
              title="Skip"
              icon={Icon.Forward}
              onAction={finish}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
