import { failToast, showError } from "@chrismessina/raycast-kit";
import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { detectPlatform, isPlatformId, PlatformId, PLATFORMS } from "../catalog/platforms";
import { addCustomApp, updateCustomApp } from "../helpers/apps";
import { cacheFavicon } from "../helpers/favicons";
import { isHandleDomain, validateUrlTemplate } from "../helpers/url";
import { AppEntry } from "../types";

interface CustomAppFormProps {
  app?: AppEntry;
}

const DETECT = "detect";
const NONE = "none";

export default function CustomAppForm({ app }: CustomAppFormProps) {
  const { pop } = useNavigation();
  // Controlled, so a re-render while detection runs can't reset what was typed
  const [name, setName] = useState(app?.name ?? "");
  const [url, setUrl] = useState(app?.urlTemplate ?? "");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [handleDomain, setHandleDomain] = useState(app?.handleDomain ?? "");
  const handleDomainError =
    handleDomain.trim() && !isHandleDomain(handleDomain.trim()) ? "Enter a domain, such as bsky.social" : undefined;
  const [platform, setPlatform] = useState<string>(app?.platform ?? DETECT);
  const [isDetecting, setIsDetecting] = useState(false);
  // What detection knows: the URL it last ran for, whether the user has picked a platform since, the value it put in
  // the dropdown (Raycast reports it back through onChange as if the user had picked it), and a count that a new URL,
  // a pick by hand, saving or leaving bumps, so an answer that arrives after any of them is ignored
  const detection = useRef<{ url?: string; pickedByHand: boolean; echo?: string; run: number; latest: number }>({
    url: app?.platform ? app.urlTemplate.trim() : undefined,
    pickedByHand: false,
    run: 0,
    latest: 0,
  });
  useEffect(
    () => () => {
      detection.current.run++;
    },
    [],
  );

  /**
   * Ask the site which platform it runs, in the background, and show the answer in the Platform dropdown. A
   * convenience: saving never waits for it, and the dropdown can always be set by hand.
   */
  const detect = async (url: string) => {
    detection.current.url = url;
    const run = ++detection.current.run;
    detection.current.latest = run;
    const isCurrent = () => run === detection.current.run && !detection.current.pickedByHand;
    setIsDetecting(true);
    try {
      const found = await detectPlatform(url);
      if (!isCurrent()) return;
      detection.current.echo = found ?? NONE;
      setPlatform(found ?? NONE);
    } catch (error) {
      // Offline or the site is down: say so once, and leave the dropdown on Detect so it tries again on the next blur
      if (!isCurrent()) return;
      detection.current.url = undefined;
      await showError(error, { title: "Couldn't Reach the Site", message: "Pick the platform by hand, or try again" });
    } finally {
      // The newest detection started clears the spinner, even when its answer went stale
      if (run === detection.current.latest) setIsDetecting(false);
    }
  };

  const handleUrlBlur = (url: string) => {
    const trimmed = url.trim();
    const { url: detectedFor, pickedByHand } = detection.current;
    if (!trimmed || validateUrlTemplate(trimmed) || pickedByHand || detectedFor === trimmed) return;
    void detect(trimmed);
  };

  const handleSubmit = async (values: { nsfw: boolean }) => {
    // Saving never waits for detection: still on Detect means no platform, and a pending answer is dropped
    const resolved = isPlatformId(platform) ? platform : undefined;
    detection.current.run++;
    const toast = await showToast({ style: Toast.Style.Animated, title: app ? "Updating App…" : "Adding App…" });
    try {
      if (resolved === "atproto" && handleDomainError) throw new Error(handleDomainError);
      const input = {
        name,
        urlTemplate: url,
        platform: resolved,
        nsfw: values.nsfw,
        // Only an ATProto app completes bare names
        handleDomain: resolved === "atproto" ? handleDomain.trim() || undefined : undefined,
      };
      const saved = app ? await updateCustomApp(app.value, input) : await addCustomApp(input);
      void cacheFavicon(saved.urlTemplate);
      toast.style = Toast.Style.Success;
      toast.title = app ? "App Updated" : "App Added";
      toast.message = resolved ? `${saved.name} · ${PLATFORMS[resolved].name}` : saved.name;
      pop();
    } catch (error) {
      failToast(toast, error, { title: app ? "Couldn't Update App" : "Couldn't Add App" });
    }
  };

  return (
    <Form
      isLoading={isDetecting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={app ? "Update App" : "Add App"}
            icon={app ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Custom Social Network"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="url"
        title="URL Template"
        placeholder="https://example.com/{profile}"
        value={url}
        error={urlError}
        onChange={(newValue) => {
          setUrl(newValue);
          if (newValue.trim() !== detection.current.url) {
            // A detection still running answers for the old URL, and a platform detected for it doesn't carry over.
            // Forgetting the URL lets the next blur ask again, even after the edit is undone.
            detection.current.run++;
            detection.current.url = undefined;
            if (!detection.current.pickedByHand && platform !== DETECT) {
              detection.current.echo = DETECT;
              setPlatform(DETECT);
            }
          }
          setUrlError(newValue.trim() ? validateUrlTemplate(newValue) : undefined);
        }}
        onBlur={() => handleUrlBlur(url)}
      />
      <Form.Description text="Use {profile} as the placeholder for the username." />
      <Form.Dropdown
        id="platform"
        title="Platform"
        value={platform}
        onChange={(value) => {
          if (value === detection.current.echo) {
            detection.current.echo = undefined;
          } else if (value !== platform) {
            // Choosing Detect Automatically hands the choice back to detection; anything else is the user's pick
            detection.current.pickedByHand = value !== DETECT;
            // Back on Detect, the next time the URL field loses focus asks again, even for the same URL
            if (value === DETECT) detection.current.url = undefined;
            detection.current.run++;
          }
          setPlatform(value);
        }}
        info="Sites running the same software check usernames the same way, so Find Profile can check this app"
      >
        <Form.Dropdown.Item value={DETECT} title="Detect Automatically" icon={Icon.Wand} />
        <Form.Dropdown.Item value={NONE} title="None" icon={Icon.Minus} />
        {(Object.keys(PLATFORMS) as PlatformId[]).map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={PLATFORMS[id].name} />
        ))}
      </Form.Dropdown>
      {platform === "atproto" && (
        <Form.TextField
          id="handleDomain"
          title="Handle Domain"
          placeholder="bsky.social"
          value={handleDomain}
          error={handleDomainError}
          onChange={setHandleDomain}
          info="The server a bare name belongs to, so typing example opens example.bsky.social"
        />
      )}
      <Form.Checkbox
        id="nsfw"
        title="Content"
        label="NSFW"
        defaultValue={app?.nsfw ?? false}
        info="Find Profile leaves NSFW apps out unless you include NSFW sites"
      />
    </Form>
  );
}
