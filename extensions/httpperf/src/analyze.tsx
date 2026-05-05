import { Action, ActionPanel, Form, Icon, showToast, Toast, List, Color } from "@raycast/api";
import React, { useState } from "react";
import { analyzeHTTPPerformance, formatBytes, formatSpeed, formatTime } from "./utils/httpPerf";
import { HTTPPerformanceMetrics, FormValues } from "./types";

export default function Command() {
  const [metrics, setMetrics] = useState<HTTPPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");

  async function handleAnalyze(values: FormValues) {
    const { url, method, headers: headersString, followRedirects } = values;

    if (!url) {
      showToast({
        style: Toast.Style.Failure,
        title: "URL is required",
      });
      return;
    }

    // Ensure URL has protocol
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = `https://${url}`;
    }

    setIsLoading(true);
    setMetrics(null);

    try {
      // Parse headers
      const headers: Record<string, string> = {};
      if (headersString) {
        const lines = headersString.split("\n");
        for (const line of lines) {
          const [key, ...valueParts] = line.split(":");
          if (key && valueParts.length > 0) {
            headers[key.trim()] = valueParts.join(":").trim();
          }
        }
      }

      const result = await analyzeHTTPPerformance({
        url: finalUrl,
        method,
        headers,
        followRedirects,
      });

      setMetrics(result);
      setPendingUrl(""); // Clear pendingUrl after successful analysis
      showToast({
        style: Toast.Style.Success,
        title: "Analysis complete",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleBackWithUrl = (url: string) => {
    setPendingUrl(url);
    setMetrics(null);
  };

  if (metrics) {
    return <ResultView metrics={metrics} onBack={() => setMetrics(null)} onBackWithUrl={handleBackWithUrl} />;
  }

  return (
    <Form
      key={pendingUrl}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Analyze" onSubmit={handleAnalyze} icon={Icon.Play} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        defaultValue={pendingUrl}
        info="Enter the URL to analyze (protocol is optional, defaults to HTTPS)"
      />
      <Form.Dropdown id="method" title="HTTP Method" defaultValue="GET">
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="POST" title="POST" />
        <Form.Dropdown.Item value="PUT" title="PUT" />
        <Form.Dropdown.Item value="DELETE" title="DELETE" />
        <Form.Dropdown.Item value="HEAD" title="HEAD" />
        <Form.Dropdown.Item value="PATCH" title="PATCH" />
        <Form.Dropdown.Item value="OPTIONS" title="OPTIONS" />
      </Form.Dropdown>
      <Form.TextArea
        id="headers"
        title="Custom Headers"
        placeholder="Authorization: Bearer token&#10;Content-Type: application/json"
        info="Enter one header per line in the format: Header-Name: Value"
      />
      <Form.Checkbox id="followRedirects" title="Follow Redirects" defaultValue={true} label="Follow HTTP redirects" />
    </Form>
  );
}

function ResultView({
  metrics,
  onBack,
  onBackWithUrl,
}: {
  metrics: HTTPPerformanceMetrics;
  onBack: () => void;
  onBackWithUrl: (url: string) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const performanceGrade = getPerformanceGrade(metrics.totalTime);
  const statusInfo = getStatusCodeInfo(metrics.statusCode);
  const total = metrics.totalTime;

  // Calculate percentages (handle division by zero)
  const dnsPercent = total > 0 ? ((metrics.dnsTime / total) * 100).toFixed(1) : "0.0";
  const tcpPercent = total > 0 ? ((metrics.tcpTime / total) * 100).toFixed(1) : "0.0";
  const tlsPercent = total > 0 ? ((metrics.tlsTime / total) * 100).toFixed(1) : "0.0";
  const serverPercent = total > 0 ? ((metrics.serverTime / total) * 100).toFixed(1) : "0.0";
  const transferPercent = total > 0 ? ((metrics.transferTime / total) * 100).toFixed(1) : "0.0";

  // Status helpers
  const getPhaseStatus = (time: number, thresholds: [number, number]) => {
    if (time < thresholds[0]) return "✅";
    if (time < thresholds[1]) return "⚠️";
    return "🔴";
  };

  // Handle new URL input from search bar - go back to form with URL
  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      onBackWithUrl(searchText.trim());
    }
  };

  const textSummary = `${metrics.method} ${metrics.url}
${statusInfo.icon} ${metrics.statusCode} ${statusInfo.text} · HTTP/${metrics.httpVersion} · ${performanceGrade.icon} ${performanceGrade.grade} · ${formatTime(total)}

DNS Lookup:       ${formatTime(metrics.dnsTime)} (${dnsPercent}%)
TCP Connection:   ${formatTime(metrics.tcpTime)} (${tcpPercent}%)
${metrics.tlsTime > 0 ? `TLS Handshake:    ${formatTime(metrics.tlsTime)} (${tlsPercent}%)\n` : ""}Server Processing: ${formatTime(metrics.serverTime)} (${serverPercent}%)
Content Transfer:  ${formatTime(metrics.transferTime)} (${transferPercent}%)
Total:            ${formatTime(total)}

Downloaded: ${formatBytes(metrics.sizeDownload)} · Speed: ${formatSpeed(metrics.speedDownload)} · Remote: ${metrics.remoteIp}
`;

  const isFailed = metrics.statusCode >= 400;
  const statusColor = isFailed ? Color.Red : metrics.statusCode >= 300 ? Color.Orange : Color.Green;

  const actions = (
    <ActionPanel>
      <Action title="Back to Form" onAction={onBack} icon={Icon.RotateClockwise} />
      <Action.CopyToClipboard title="Copy Results" content={textSummary} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action.CopyToClipboard title="Copy URL" content={metrics.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={`${performanceGrade.icon} ${formatTime(total)}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a new URL (press Enter to go to form)"
    >
      {searchText.trim() && (
        <List.Item
          title={`Go to form with: ${searchText}`}
          subtitle="Press Enter to analyze this URL"
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Go to Form" onAction={handleSearchSubmit} icon={Icon.ArrowRight} />
            </ActionPanel>
          }
        />
      )}

      <List.Item
        title={`${metrics.method} ${metrics.url}`}
        subtitle={`${metrics.remoteIp} · HTTP/${metrics.httpVersion} · ${statusInfo.icon} ${metrics.statusCode} ${statusInfo.text} · ${performanceGrade.icon} ${performanceGrade.grade}`}
        icon={{ source: Icon.Link, tintColor: statusColor }}
        actions={actions}
      />

      <List.Item
        title="Downloaded"
        subtitle={`${formatBytes(metrics.sizeDownload)} at ${formatSpeed(metrics.speedDownload)}`}
        icon={{ source: Icon.Download, tintColor: Color.SecondaryText }}
        actions={actions}
      />

      <List.Item
        title="DNS Lookup"
        subtitle={formatTime(metrics.dnsTime)}
        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        accessories={[{ text: `${dnsPercent}%` }, { text: getPhaseStatus(metrics.dnsTime, [50, 150]) }]}
        actions={actions}
      />

      <List.Item
        title="TCP Connection"
        subtitle={formatTime(metrics.tcpTime)}
        icon={{ source: Icon.Network, tintColor: Color.Blue }}
        accessories={[{ text: `${tcpPercent}%` }, { text: getPhaseStatus(metrics.tcpTime, [100, 200]) }]}
        actions={actions}
      />

      {metrics.tlsTime > 0 && (
        <List.Item
          title="TLS Handshake"
          subtitle={formatTime(metrics.tlsTime)}
          icon={{ source: Icon.Lock, tintColor: Color.Blue }}
          accessories={[{ text: `${tlsPercent}%` }, { text: getPhaseStatus(metrics.tlsTime, [200, 400]) }]}
          actions={actions}
        />
      )}

      <List.Item
        title="Server Processing"
        subtitle={formatTime(metrics.serverTime)}
        icon={{ source: Icon.MemoryChip, tintColor: Color.Purple }}
        accessories={[{ text: `${serverPercent}%` }, { text: getPhaseStatus(metrics.serverTime, [500, 1500]) }]}
        actions={actions}
      />

      <List.Item
        title="Content Transfer"
        subtitle={formatTime(metrics.transferTime)}
        icon={{ source: Icon.Switch, tintColor: Color.Green }}
        accessories={[{ text: `${transferPercent}%` }, { text: getPhaseStatus(metrics.transferTime, [200, 600]) }]}
        actions={actions}
      />

      <List.Item
        title="Total Time"
        subtitle={formatTime(total)}
        icon={{ source: Icon.Clock, tintColor: Color.Purple }}
        actions={actions}
      />
    </List>
  );
}

// Helper function to get performance grade
function getPerformanceGrade(totalTime: number): { grade: string; icon: string } {
  if (totalTime < 200) {
    return { grade: "A+", icon: "🚀" };
  } else if (totalTime < 500) {
    return { grade: "A", icon: "⚡" };
  } else if (totalTime < 1000) {
    return { grade: "B", icon: "✅" };
  } else if (totalTime < 2000) {
    return { grade: "C", icon: "👍" };
  } else if (totalTime < 3000) {
    return { grade: "D", icon: "⚠️" };
  } else {
    return { grade: "F", icon: "🐌" };
  }
}

// Helper function to get status code information
function getStatusCodeInfo(statusCode: number): { icon: string; text: string } {
  if (statusCode >= 200 && statusCode < 300) {
    return { icon: "✅", text: "Success" };
  } else if (statusCode >= 300 && statusCode < 400) {
    return { icon: "🔄", text: "Redirect" };
  } else if (statusCode >= 400 && statusCode < 500) {
    return { icon: "❌", text: "Client Error" };
  } else if (statusCode >= 500) {
    return { icon: "🔥", text: "Server Error" };
  } else {
    return { icon: "ℹ️", text: "Info" };
  }
}
