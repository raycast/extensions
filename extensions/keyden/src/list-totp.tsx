import {
    Action,
    ActionPanel,
    Color,
    getPreferenceValues,
    Icon,
    Keyboard,
    List,
    openCommandPreferences,
} from "@raycast/api";
import { getAvatarIcon, getProgressIcon } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeydenPathError, listTotps, TotpEntry, TotpSnapshot } from "./keyden";

const AVATAR_COLORS = ["#4F7DF3", "#7857D9", "#C84B9B", "#D94B4B", "#D9822B", "#2F9E74", "#2185A6"];
const NO_ISSUER_LABEL = "No Issuer";
const avatarCache = new Map<string, ReturnType<typeof getAvatarIcon>>();

function getEntryAvatar(entry: TotpEntry) {
    const label = entry.issuer || entry.account;
    const cachedAvatar = avatarCache.get(label);
    if (cachedAvatar) return cachedAvatar;

    let hash = 0;
    for (const character of label) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;

    const initial = Array.from(label.trim())[0]?.toLocaleUpperCase() ?? "?";
    const avatar = getAvatarIcon(initial, {
        background: AVATAR_COLORS[hash % AVATAR_COLORS.length],
        gradient: true,
    });
    avatarCache.set(label, avatar);
    return avatar;
}

function getRemainingSeconds(entry: TotpEntry, now: number) {
    return Math.max(0, Math.ceil((entry.expiresAt - now) / 1_000));
}

function getCountdownColor(remainingSeconds: number) {
    if (remainingSeconds <= 5) return Color.Red;
    if (remainingSeconds <= 10) return Color.Yellow;
    return Color.Blue;
}

function getCountdownIcon(remainingSeconds: number) {
    return getProgressIcon(Math.min(1, remainingSeconds / 30), getCountdownColor(remainingSeconds));
}

function formatTotpCode(code: string) {
    const middle = Math.ceil(code.length / 2);
    return `${code.slice(0, middle)} ${code.slice(middle)}`;
}

function TotpDetail({ entry, now }: { entry: TotpEntry; now: number }) {
    const remainingSeconds = getRemainingSeconds(entry, now);

    return (
        <List.Item.Detail
            markdown={
                entry.code
                    ? `# ${formatTotpCode(entry.code)}`
                    : "# TOTP Unavailable\n\nKeyden could not generate a code for this account."
            }
            metadata={
                <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Issuer" text={entry.issuer || "—"} icon={Icon.Building} />
                    <List.Item.Detail.Metadata.Label title="Account" text={entry.account || "—"} icon={Icon.Person} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                        title="TOTP Code"
                        text={entry.code || "Unavailable"}
                        icon={entry.code ? Icon.Key : { source: Icon.Warning, tintColor: Color.Yellow }}
                    />
                    <List.Item.Detail.Metadata.Label
                        title="Remaining"
                        text={`${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`}
                        icon={getCountdownIcon(remainingSeconds)}
                    />
                </List.Item.Detail.Metadata>
            }
        />
    );
}

function TotpListItem({
    entry,
    now,
    idPrefix,
    showIssuer,
    refresh,
}: {
    entry: TotpEntry;
    now: number;
    idPrefix: string;
    showIssuer?: boolean;
    refresh: () => Promise<void>;
}) {
    const remainingSeconds = getRemainingSeconds(entry, now);

    return (
        <List.Item
            id={`${idPrefix}:${entry.id}`}
            icon={getEntryAvatar(entry)}
            title={entry.account || entry.issuer}
            subtitle={showIssuer && entry.account ? entry.issuer || NO_ISSUER_LABEL : undefined}
            keywords={[entry.issuer, entry.account].filter(Boolean)}
            accessories={[
                ...(entry.code
                    ? []
                    : [{ text: "Unavailable", icon: { source: Icon.Warning, tintColor: Color.Yellow } }]),
                { text: `${remainingSeconds}s`, icon: getCountdownIcon(remainingSeconds) },
            ]}
            detail={<TotpDetail entry={entry} now={now} />}
            actions={
                <ActionPanel>
                    {entry.code ? (
                        <Action.CopyToClipboard
                            title="Copy TOTP Code"
                            content={entry.code}
                            concealed
                            icon={Icon.Clipboard}
                        />
                    ) : null}
                    <Action
                        title="Refresh Codes"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={refresh}
                    />
                </ActionPanel>
            }
        />
    );
}

export default function Command() {
    const { keydenPath } = getPreferenceValues<Preferences.ListTotp>();
    const [snapshot, setSnapshot] = useState<TotpSnapshot>();
    const [error, setError] = useState<Error>();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [now, setNow] = useState(Date.now());

    const refresh = useCallback(async () => {
        setIsRefreshing(true);

        try {
            const nextSnapshot = await listTotps(keydenPath);
            setSnapshot(nextSnapshot);
            setError(undefined);
            setNow(Date.now());
        } catch (caughtError) {
            setSnapshot(undefined);
            setError(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
        } finally {
            setIsRefreshing(false);
        }
    }, [keydenPath]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(timer);
    }, []);

    const nextExpiry = useMemo(() => {
        if (!snapshot?.entries.length) return undefined;
        return Math.min(...snapshot.entries.map((entry) => entry.expiresAt));
    }, [snapshot]);

    useEffect(() => {
        if (!nextExpiry) return;

        const timer = setTimeout(() => void refresh(), Math.max(0, nextExpiry - Date.now() + 150));
        return () => clearTimeout(timer);
    }, [nextExpiry, snapshot?.fetchedAt, refresh]);

    const sections = useMemo(() => {
        const groupedEntries = new Map<string, TotpEntry[]>();

        for (const entry of snapshot?.entries ?? []) {
            const entries = groupedEntries.get(entry.issuer) ?? [];
            entries.push(entry);
            groupedEntries.set(entry.issuer, entries);
        }

        return [...groupedEntries.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([issuer, entries]) => ({
                issuer,
                entries: entries.sort((left, right) => {
                    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
                    return left.account.localeCompare(right.account);
                }),
            }));
    }, [snapshot]);

    const pinnedEntries = useMemo(() => snapshot?.entries.filter((entry) => entry.isPinned) ?? [], [snapshot]);

    return (
        <List
            isLoading={isRefreshing && !snapshot}
            isShowingDetail={Boolean(snapshot?.entries.length)}
            navigationTitle="Keyden TOTPs"
            searchBarPlaceholder="Search accounts or issuers"
        >
            {error && !snapshot ? (
                <List.EmptyView
                    icon={{ source: Icon.Warning, tintColor: Color.Red }}
                    title={error instanceof KeydenPathError ? "Keyden CLI Path Required" : "Unable to Load TOTPs"}
                    description={error.message}
                    actions={
                        <ActionPanel>
                            {error instanceof KeydenPathError ? (
                                <Action
                                    title="Open Command Preferences"
                                    icon={Icon.Cog}
                                    onAction={openCommandPreferences}
                                />
                            ) : (
                                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
                            )}
                        </ActionPanel>
                    }
                />
            ) : snapshot?.entries.length === 0 ? (
                <List.EmptyView
                    icon={Icon.Key}
                    title="No TOTP Accounts"
                    description="Add an account in Keyden, then refresh this list."
                    actions={
                        <ActionPanel>
                            <Action title="Refresh Codes" icon={Icon.ArrowClockwise} onAction={refresh} />
                        </ActionPanel>
                    }
                />
            ) : (
                <>
                    {pinnedEntries.length > 0 ? (
                        <List.Section title="📌 Pinned" subtitle={`${pinnedEntries.length}`}>
                            {pinnedEntries.map((entry) => (
                                <TotpListItem
                                    key={`pinned:${entry.id}`}
                                    idPrefix="pinned"
                                    entry={entry}
                                    now={now}
                                    showIssuer
                                    refresh={refresh}
                                />
                            ))}
                        </List.Section>
                    ) : null}
                    {sections.map((section) => (
                        <List.Section
                            key={section.issuer}
                            title={section.issuer || NO_ISSUER_LABEL}
                            subtitle={`${section.entries.length}`}
                        >
                            {section.entries.map((entry) => (
                                <TotpListItem
                                    key={entry.id}
                                    idPrefix="account"
                                    entry={entry}
                                    now={now}
                                    refresh={refresh}
                                />
                            ))}
                        </List.Section>
                    ))}
                </>
            )}
        </List>
    );
}
