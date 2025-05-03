import React from "react";
import { runAppleScript } from "@raycast/utils";

type ActiveTab = {
    url: string;
    title: string;
};

export function useActiveTab() {
    const [activeTab, setActiveTab] = React.useState<ActiveTab | null>(null);

    React.useEffect(() => {
        (async () => {
            try {
                const activeWindow = await getActiveWindow();

                if (!supportedBrowsers.some((browser) => browser === activeWindow)) {
                    return;
                }

                const activeTab = await getActiveTabByBrowser[activeWindow as Browser]();

                if (!activeTab) {
                    return;
                }

                const { url, title } = extractUrlAndTitle(activeTab);

                if (!url.startsWith("http")) {
                    return;
                }

                setActiveTab({
                    url,
                    title,
                });
            } catch (error) {
                console.error(error);
            }
        })();
    }, []);

    return activeTab;
}

/////////////////////////////////////////////////////////////////////////////////////////

type Browser = "Google Chrome" | "Safari" | "firefox" | "Brave Browser" | "Arc";

function getActiveWindow() {
    return runAppleScript(
        `tell application "System Events" to get name of (processes whose frontmost is true) as text`,
    );
}

const getActiveTabByBrowser = {
    "Google Chrome": () =>
        runAppleScript(`
            tell application "Google Chrome"
                if it is running then    
                    get {URL, title} of active tab of front window
                end if
            end tell
        `),
    Arc: () =>
        runAppleScript(`
            tell application "Arc"
                if it is running then
                    get {URL, title} of active tab of front window
                end if
            end tell
    `),
    Safari: () =>
        runAppleScript(`
            tell application "Safari"
                if it is running then
                    get {URL of front document, name of front document}
                end if
            end tell
        `),
    firefox: () => {},
    "Brave Browser": () =>
        runAppleScript(`
            tell application "Brave Browser"
                if it is running then
                    get {URL, title} of active tab of front window
                end if
            end tell
        `),
} as const;

const supportedBrowsers = Object.keys(getActiveTabByBrowser);

function extractUrlAndTitle(string: string) {
    const commaIndex = string.indexOf(",");
    const url = string.slice(0, commaIndex).trim();
    const title = string.slice(commaIndex + 1).trim();

    return {
        url,
        title: title.trim(),
    };
}
