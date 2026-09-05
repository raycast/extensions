import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { fetchGeo } from "./lib/fetchGeo";
import { fetchTrace } from "./lib/fetchTrace";
import { flagForCountryCode } from "./lib/flag";
import { nextState, type CardState } from "./lib/refresh";

function countryNameForCode(countryCode: string | undefined): string {
  if (!countryCode) return "Unknown country";

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

function markdownForState(state: CardState): string {
  if (state.kind === "loading") return "";

  if (state.kind === "blocked") {
    const footer =
      state.reason === "status"
        ? "claude.ai/cdn-cgi/trace · HTTP " + state.status
        : "claude.ai/cdn-cgi/trace · HTTP " + state.status + " · not a claude.ai trace";
    return [
      "# Something answered, but not Claude",
      "",
      "The response didn't come from Claude's edge — usually a proxy, VPN, or captive portal answering in its place. Check that your proxy is running and you're signed in to the network, then refresh.",
      "",
      "---",
      "",
      "`" + footer + "`",
    ].join("\n");
  }

  if (state.kind === "unreachable") {
    return [
      "# Couldn't reach claude.ai",
      "",
      "Nothing came back at all — your connection or proxy is down, or something is blocking `claude.ai` before it can respond. Check your network, then refresh.",
      "",
      "---",
      "",
      "`claude.ai/cdn-cgi/trace · no response`",
    ].join("\n");
  }

  const flag = flagForCountryCode(state.countryCode);
  const headline = "# " + (flag ? flag + " " : "") + state.ip;
  const location =
    state.kind === "success"
      ? [state.country, state.city, state.isp].filter(Boolean).join(" · ")
      : countryNameForCode(state.countryCode);
  const locationLine = state.kind === "geo-failed" ? location + " — location lookup failed" : location;

  return [headline, "", locationLine, "", "---", "", "The IP claude.ai sees you from"].join("\n");
}

export default function Command() {
  const abortable = useRef<AbortController | null>(null);
  const [state, setState] = useState<CardState>({ kind: "loading" });

  const loader = async () => {
    const signal = abortable.current?.signal ?? new AbortController().signal;
    const trace = await fetchTrace(signal);
    if (signal.aborted) return;

    setState((prev) => nextState(prev, trace));
    if (trace.kind !== "ok") return;

    const geo = await fetchGeo(trace.ip, signal);
    if (signal.aborted) return;

    setState(
      geo.kind === "ok"
        ? {
            kind: "success",
            ip: trace.ip,
            countryCode: geo.countryCode,
            country: geo.country,
            city: geo.city,
            ...(geo.isp ? { isp: geo.isp } : {}),
            ...(geo.asn !== undefined ? { asn: geo.asn } : {}),
          }
        : { kind: "geo-failed", ip: trace.ip, countryCode: trace.countryCode },
    );
  };

  const { isLoading, revalidate } = usePromise(loader, [], { abortable });

  const refreshAction = (
    <Action title="Refresh" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={() => revalidate()} />
  );

  let actions;
  if (state.kind === "loading" || state.kind === "blocked" || state.kind === "unreachable") {
    actions = <ActionPanel>{refreshAction}</ActionPanel>;
  } else if (state.kind === "ip-only") {
    actions = (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy IP" content={state.ip} />
        {refreshAction}
      </ActionPanel>
    );
  } else {
    const location =
      state.kind === "success"
        ? [state.ip, state.country, state.city, state.isp].filter(Boolean).join(" · ")
        : state.countryCode
          ? [state.ip, countryNameForCode(state.countryCode)].join(" · ")
          : undefined;

    actions = (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy IP" content={state.ip} />
        {location ? (
          <Action.CopyToClipboard
            title="Copy IP + Location"
            content={location}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        ) : null}
        {state.kind === "success" && state.asn !== undefined ? (
          <Action.CopyToClipboard
            title="Copy ASN"
            content={"AS" + state.asn}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        ) : null}
        {refreshAction}
      </ActionPanel>
    );
  }

  return <Detail isLoading={isLoading} markdown={markdownForState(state)} actions={actions} />;
}
