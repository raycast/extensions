import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { User } from "@clerk/backend";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parsePositiveIntOrUndefined } from "../lib/parse";
import { primaryEmail, fullName } from "../lib/user";
import { TokenResultDetail } from "./token-result";

export function ImpersonationTokenForm({ app, userId }: { app: ClerkApp; userId: string }) {
  const { push } = useNavigation();
  const [actorId, setActorId] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [selectedActor, setSelectedActor] = useState<User | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState("");
  const [sessionMax, setSessionMax] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: actorResults, isLoading: actorsLoading } = useCachedPromise(
    async (query: string) => {
      const res = await clientFor(app).users.getUserList({ query: query || undefined, limit: 20 });
      return res.data;
    },
    [actorSearch],
    { onError: showClerkError, keepPreviousData: true },
  );

  function onActorChange(id: string) {
    setActorId(id);
    if (!id) {
      setSelectedActor(null);
      return;
    }
    const match = (actorResults ?? []).find((u) => u.id === id);
    if (match) setSelectedActor(match);
  }

  const results = actorResults ?? [];
  const showSelectedSeparately = selectedActor && !results.some((u) => u.id === selectedActor.id);

  async function submit() {
    if (!actorId) {
      await showToast({ style: Toast.Style.Failure, title: "Select the impersonating user" });
      return;
    }
    let expires: number | undefined;
    let sessionMaxDuration: number | undefined;
    try {
      expires = parsePositiveIntOrUndefined(expiresInSeconds);
      sessionMaxDuration = parsePositiveIntOrUndefined(sessionMax);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Durations must be positive whole numbers" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating impersonation token" });
    try {
      const t = await clientFor(app).actorTokens.create({
        userId,
        actor: { sub: actorId },
        expiresInSeconds: expires,
        sessionMaxDurationInSeconds: sessionMaxDuration,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Impersonation token created";
      push(
        <TokenResultDetail
          title="Impersonation Token"
          urlLabel="Impersonation URL"
          url={t.url ?? ""}
          token={t.token ?? ""}
          status={t.status}
        />,
      );
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Impersonation Token" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="actor"
        title="Actor (Impersonating User)"
        value={actorId}
        onChange={onActorChange}
        onSearchTextChange={setActorSearch}
        throttle
        isLoading={actorsLoading}
        filtering={false}
      >
        <Form.Dropdown.Item value="" title="Search and select a user…" icon={Icon.MagnifyingGlass} />
        {showSelectedSeparately && selectedActor && (
          <Form.Dropdown.Item
            value={selectedActor.id}
            title={`${fullName(selectedActor)} — ${primaryEmail(selectedActor)}`}
            icon={selectedActor.imageUrl ? { source: selectedActor.imageUrl } : Icon.Person}
          />
        )}
        {results.map((u) => (
          <Form.Dropdown.Item
            key={u.id}
            value={u.id}
            title={`${fullName(u)} — ${primaryEmail(u)}`}
            icon={u.imageUrl ? { source: u.imageUrl } : Icon.Person}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="The actor is the user who will be impersonating the target user." />
      <Form.TextField
        id="expiresInSeconds"
        title="Expires in Seconds"
        placeholder="optional (default 1h)"
        value={expiresInSeconds}
        onChange={setExpiresInSeconds}
      />
      <Form.TextField
        id="sessionMax"
        title="Session Max Duration (seconds)"
        placeholder="optional (default 30m)"
        value={sessionMax}
        onChange={setSessionMax}
      />
    </Form>
  );
}
