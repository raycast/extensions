import React, { useState } from "react";
import { Toast, ActionPanel, Action, getPreferenceValues, List, Icon, showToast } from "@raycast/api";
import { Preferences } from "./types/preferences";
import axios from "axios";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState({
    ip: "",
    IPNumber: "",
    countryName: "",
    countryCode: "",
    regionName: "",
    cityName: "",
    continentName: "",
    continentCode: "",
    timezone: {},
    currency: {
      currencyName: "",
      currencyCode: "",
      currencySymbol: "",
    },
  });

  const loadData = async () => {
    await axios
      .get(
        "https://gregeoip.com/GeoIP?key=" +
          preferences.apikey +
          "&lang=" +
          preferences.lang +
          "&params=timezone,currency"
      )
      .then((data) => {
        if (data?.data?.status == "success") {
          setData(data?.data?.data);
        } else {
          setError(new Error(data?.data?.description));
        }
      })
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setError(new Error("Couldn't connect to Greip!"));
      });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "ERR:",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List throttle>
      {!loading ? (
        <>
          <List.Section title="Main Information">
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"IP Address: " + data.ip}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.ip} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"IP Number: " + data.IPNumber}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.IPNumber} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"Country: " + data.countryName + " (" + data.countryCode + ")"}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.countryName + " (" + data.countryCode + ")"} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"Region: " + data.regionName}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.regionName} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"City: " + data.cityName}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.cityName} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"Continent: " + data.continentName + " (" + data.continentCode + ")"}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.continentName + " (" + data.continentCode + ")"} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Currency Information">
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"Currency Name: " + data.currency.currencyName}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.currency.currencyName} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"Currency Code: " + data.currency.currencyCode}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.currency.currencyCode} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.ArrowRightCircleFilled, tintColor: { dark: "#2196fc", light: "#2196fc" } }}
              title={"Symbol: " + data.currency.currencySymbol}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy result">
                    <Action.CopyToClipboard content={data.currency.currencySymbol} />
                    <Action.CopyToClipboard
                      content={JSON.stringify(data, null, 2)}
                      title="Copy full information (JSON)"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Greip Pages">
                    <Action.OpenInBrowser
                      url="https://greip.io"
                      title="Greip Website"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action.OpenInBrowser
                      url="https://greip.io/dashboard/Home"
                      title="Greip Dashboard"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                    />
                    <Action.OpenInBrowser
                      url="https://docs.greip.io"
                      title="Greip Documentation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : (
        <List.EmptyView icon={{ source: Icon.Hourglass }} title="Fetching the data.." />
      )}
    </List>
  );
}
