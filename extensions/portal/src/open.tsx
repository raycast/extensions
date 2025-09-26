import React, { useMemo, useState } from "react";
import { Action, ActionPanel, List, open } from "@raycast/api";

type Target = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  keywords: string[];
};

const TARGETS: Target[] = [
  {
    id: "portal-home",
    title: "Portal",
    subtitle: "Home",
    url: "https://portal.fnf.co.kr/",
    keywords: ["portal", "home", "main", "fnf"],
  },
  {
    id: "portal-work",
    title: "Work",
    subtitle: "Approvals & Work Tab",
    url: "https://portal.fnf.co.kr/?tab=work",
    keywords: ["approval", "work", "전자결재", "품의", "task"],
  },
  {
    id: "org-chart",
    title: "Organizational Chart",
    subtitle: "Portal",
    url: "https://portal.fnf.co.kr/organization/",
    keywords: ["organization", "org", "chart", "조직도"],
  },
  {
    id: "simply-accounting",
    title: "Simply Accounting",
    subtitle: "EAS",
    url: "https://eas.fnf.co.kr/eaccounting.html",
    keywords: ["accounting", "eas", "법인카드", "전표"],
  },
];

export default function Command() {
  const [q, setQ] = useState("");
  const data = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TARGETS;
    return TARGETS.filter((t) =>
      [t.title, t.subtitle, t.url, ...t.keywords].some((v) => (v || "").toLowerCase().includes(s)),
    );
  }, [q]);

  return (
    <List searchBarPlaceholder="Search what to open…" onSearchTextChange={setQ} throttle>
      {data.map((t) => (
        <List.Item
          key={t.id}
          title={t.title}
          subtitle={t.subtitle}
          accessories={[{ text: t.url }]}
          actions={
            <ActionPanel>
              <Action title="Open in Chrome" onAction={() => open(t.url, "com.google.Chrome")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
