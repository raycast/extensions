import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { applyStatus, SERVICE_LABELS, ServiceKey } from "./lib/api";
import { canUseAI, generateStatuses, Suggestion } from "./lib/ai";
import { DURATION_OPTIONS, DurationKey } from "./lib/duration";
import { charFor } from "./lib/emoji";
import { defaultServices, getPrefs } from "./lib/preferences";
import { randomStatus } from "./lib/statuses";
import { addRecent, addSaved } from "./lib/storage";
import { getTone, isOnboarded, setTone } from "./lib/tone";

export default function Command() {
  const { data: onboarded, isLoading, revalidate } = usePromise(isOnboarded);

  if (isLoading) {
    return <Form isLoading />;
  }
  if (onboarded === false) {
    return <ToneForm onboarding onDone={revalidate} />;
  }
  return <SetStatusForm />;
}

function SetStatusForm() {
  const prefs = getPrefs();
  const [services, setServices] = useState<string[]>(defaultServices(prefs));
  const [notes, setNotes] = useState("");
  const [emoji, setEmoji] = useState("");
  const [text, setText] = useState("");
  const [duration, setDuration] = useState<string>("default");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasStatus = text.trim().length > 0;

  function apply(s: Suggestion) {
    setEmoji(s.emoji);
    setText(s.text);
  }

  async function generate() {
    if (!canUseAI()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast Pro required for AI",
        message: "Use ⌘R to shuffle from the built-in list instead",
      });
      return;
    }
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating suggestions…",
    });
    try {
      const tone = await getTone();
      const results = await generateStatuses(notes, tone);
      setSuggestions(results);
      setIndex(0);
      apply(results[0]);
      toast.style = Toast.Style.Success;
      toast.title = `${results.length} suggestions — ⌘R to shuffle`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "AI failed";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setLoading(false);
    }
  }

  function shuffle() {
    if (suggestions.length > 0) {
      const next = (index + 1) % suggestions.length;
      setIndex(next);
      apply(suggestions[next]);
    } else {
      // No AI suggestions yet — fall back to the built-in list.
      apply(randomStatus());
    }
  }

  async function submit() {
    if (services.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pick at least one service",
      });
      return;
    }
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No status yet",
        message: "Generate with AI (⌘G) or shuffle from the list (⌘R)",
      });
      return;
    }

    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting status…",
    });
    const results = await applyStatus(
      services as ServiceKey[],
      emoji.trim() || ":speech_balloon:",
      text.trim(),
      prefs,
      duration === "default" ? undefined : (duration as DurationKey),
    );
    setLoading(false);

    const ok = results
      .filter((r) => r.ok)
      .map((r) => SERVICE_LABELS[r.service]);
    const failed = results.filter((r) => !r.ok);

    if (ok.length > 0) {
      const chosen = emoji.trim() || ":speech_balloon:";
      await addRecent({
        emoji: chosen,
        text: text.trim(),
        gitlab_emoji: charFor(chosen),
      });
    }

    if (failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Status set on ${ok.join(", ")}`;
      await popToRoot();
    } else if (ok.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = failed
        .map((f) => `${SERVICE_LABELS[f.service]}: ${f.error}`)
        .join("\n");
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `Set on ${ok.join(", ")}`;
      toast.message = `Failed: ${failed.map((f) => `${SERVICE_LABELS[f.service]} (${f.error})`).join(", ")}`;
    }
  }

  const generateAction = (
    <Action
      title={suggestions.length > 0 ? "Generate Again" : "Generate from Notes"}
      icon={Icon.Stars}
      shortcut={{ modifiers: ["cmd"], key: "g" }}
      onAction={generate}
    />
  );
  const shuffleAction = (
    <Action
      title={
        suggestions.length > 0 ? "Shuffle Suggestion" : "Shuffle from List"
      }
      icon={Icon.Shuffle}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={shuffle}
    />
  );
  const setAction = (
    <Action.SubmitForm title="Set Status" icon={Icon.Check} onSubmit={submit} />
  );
  const saveAction = (
    <Action
      title="Save to Saved"
      icon={Icon.Star}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={async () => {
        if (!text.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No status to save",
          });
          return;
        }
        const chosen = emoji.trim() || ":speech_balloon:";
        await addSaved({
          emoji: chosen,
          text: text.trim(),
          gitlab_emoji: charFor(chosen),
        });
        await showToast({ style: Toast.Style.Success, title: "Saved" });
      }}
    />
  );
  const toneAction = (
    <Action.Push
      title="Change Tone…"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      target={<ToneForm />}
    />
  );

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          {/* Before a status exists, Enter generates. Once there is one, Enter sets it. */}
          {hasStatus ? (
            <>
              {setAction}
              {shuffleAction}
              {generateAction}
              {saveAction}
              {toneAction}
            </>
          ) : (
            <>
              {generateAction}
              {shuffleAction}
              {setAction}
              {toneAction}
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="services"
        title="Services"
        value={services}
        onChange={setServices}
      >
        {(Object.keys(SERVICE_LABELS) as ServiceKey[]).map((key) => (
          <Form.TagPicker.Item
            key={key}
            value={key}
            title={SERVICE_LABELS[key]}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id="duration"
        title="Duration"
        value={duration}
        onChange={setDuration}
        info="How long the status stays. GitLab is mapped to its nearest supported bucket."
      >
        <Form.Dropdown.Item
          value="default"
          title="Default (from preferences)"
        />
        {DURATION_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.key} value={o.key} title={o.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="A few keywords, e.g. sprint planning, too many meetings, coffee"
        info="Press ⌘G to turn these into status suggestions with Raycast AI"
        value={notes}
        onChange={setNotes}
      />
      <Form.Separator />
      {suggestions.length > 0 && (
        <Form.Description
          title="Suggestion"
          text={`${index + 1} / ${suggestions.length}  ·  ⌘R to shuffle, ⌘G to regenerate`}
        />
      )}
      <Form.TextField
        id="emoji"
        title="Emoji"
        placeholder=":fire:"
        info="Slack-style shortcode. GitLab drops the colons; GitHub keeps them."
        value={emoji}
        onChange={setEmoji}
      />
      <Form.TextField
        id="text"
        title="Status"
        placeholder="Generate from notes (⌘G) or shuffle the list (⌘R)"
        value={text}
        onChange={setText}
      />
    </Form>
  );
}

/**
 * Tone setup — shown once as onboarding on first launch, and reachable later
 * via "Change Tone…" (⌘T). The tone is appended to the built-in AI prompt.
 */
function ToneForm({
  onboarding = false,
  onDone,
}: {
  onboarding?: boolean;
  onDone?: () => void;
}) {
  const { pop } = useNavigation();
  const { data: initialTone, isLoading } = usePromise(getTone);
  const [tone, setToneValue] = useState<string | undefined>(undefined);
  const value = tone ?? initialTone ?? "";

  async function save(chosen: string) {
    await setTone(chosen);
    await showToast({
      style: Toast.Style.Success,
      title: chosen.trim() ? "Tone saved" : "Using the default tone",
    });
    if (onboarding) {
      onDone?.();
    } else {
      pop();
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={onboarding ? "Save & Start" : "Save Tone"}
            icon={Icon.Check}
            onSubmit={() => save(value)}
          />
          {onboarding && (
            <Action
              title="Skip — Use Default Tone"
              icon={Icon.ArrowRight}
              onAction={() => save("")}
            />
          )}
        </ActionPanel>
      }
    >
      {onboarding && (
        <Form.Description
          title="Welcome to Status Nerd 🤓"
          text="One quick thing: how should your AI-generated statuses sound? Describe the tone in your own words — you can change it anytime with ⌘T in Set Status."
        />
      )}
      <Form.TextArea
        id="tone"
        title="Tone"
        placeholder="e.g. dry sarcasm, dad jokes welcome, slightly dramatic, never corporate"
        info="Appended to the AI prompt as style guidance. Leave empty for the built-in default."
        value={value}
        onChange={setToneValue}
      />
    </Form>
  );
}
