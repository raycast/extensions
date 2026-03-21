import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  serverUrl: string;
  username: string;
  password: string;
}

export default function LightRAGStatus() {
  const [markdown, setMarkdown] = useState<string>("# LightRAG Status\n\n⏳ Checking...");
  const { serverUrl: rawUrl, username, password } = getPreferenceValues<Preferences>();
  const serverUrl = rawUrl.replace(/\/$/, "");

  useEffect(() => {
    async function check() {
      try {
        // Step 1: Login to get JWT token
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);
        formData.append("grant_type", "password");
        formData.append("scope", "");

        const loginRes = await fetch(`${serverUrl}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        if (!loginRes.ok) {
          setMarkdown(
            `# LightRAG Status\n\n❌ **Login failed** (HTTP ${loginRes.status})\n\nCheck your username and password in Raycast Preferences.`,
          );
          return;
        }

        const loginData = (await loginRes.json()) as { access_token?: string };
        const token = loginData.access_token;

        if (!token) {
          setMarkdown(`# LightRAG Status\n\n❌ **No access token received**`);
          return;
        }

        // Step 2: Get health with token
        const res = await fetch(`${serverUrl}/health`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setMarkdown(`# LightRAG Status\n\n⚠️ HTTP ${res.status}`);
          return;
        }

        const data = (await res.json()) as Record<string, unknown>;
        const config = data.configuration as Record<string, string> | undefined;

        let md = `# LightRAG Status\n\n✅ **Connected & Authenticated** at ${serverUrl}\n\n`;
        md += `| Property | Value |\n|:---------|:------|\n`;
        md += `| Status | ${data.status} |\n`;
        md += `| Pipeline Busy | ${data.pipeline_busy} |\n`;
        md += `| LLM Model | ${config?.llm_model || "?"} |\n`;
        md += `| Embedding Model | ${config?.embedding_model || "?"} |\n`;
        md += `| Auth Mode | ${data.auth_mode} |\n`;
        md += `| Core Version | ${data.core_version} |\n`;
        md += `| API Version | ${data.api_version} |\n`;

        setMarkdown(md);
      } catch {
        setMarkdown(
          `# LightRAG Status\n\n❌ **Cannot reach** ${serverUrl}\n\n` +
            `Make sure:\n- Wireguard VPN is active\n- LightRAG is running\n- URL, username and password are correct`,
        );
      }
    }
    check();
  }, []);

  return <Detail markdown={markdown} />;
}
