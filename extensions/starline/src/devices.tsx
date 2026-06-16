import { Action, ActionPanel, Form, Icon, List, Toast, showToast } from "@raycast/api";

import AccountActions from "./components/AccountActions";
import ClearAuthCacheAction from "./components/actions/ClearAuthCache";
import DevicesItem from "./components/Item";
import { DevicesProvider, useDevicesContext } from "./context/devices";
import { StarLineProvider, useStarLine } from "./context/starline";
import { getErrorMessage } from "./utils/errors";
import { hasText } from "./utils/format";

type CaptchaFormValues = {
    captchaValue: string;
};

function CaptchaForm({ captchaImg, captchaSid }: { captchaImg: string; captchaSid: string }) {
    const { loadItems, updateState } = useDevicesContext();
    const starline = useStarLine();

    const submitCaptcha = async ({ captchaValue }: CaptchaFormValues) => {
        try {
            await starline.loginWithCaptcha(captchaSid, captchaValue);
            updateState({ captchaImg: undefined, captchaSid: undefined });
            await loadItems();
        } catch (error) {
            await showToast(Toast.Style.Failure, "Captcha failed", getErrorMessage(error));
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Submit Captcha" onSubmit={submitCaptcha} />
                    <Action.OpenInBrowser
                        url={captchaImg}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                </ActionPanel>
            }
        >
            <Form.Description
                title="Captcha needed"
                text={`Open this captcha URL and enter the captcha to continue:\n${captchaImg}`}
            />
            <Form.TextField
                id="captchaValue"
                title="Captcha"
                placeholder="Captcha value"
                autoFocus
            />
        </Form>
    );
}

function AccountActionPanel({ reloadDevices }: { reloadDevices: () => Promise<void> }) {
    return (
        <ActionPanel>
            <ActionPanel.Section>
                <Action title="Reload Devices" onAction={reloadDevices} />
                <ClearAuthCacheAction onCleared={reloadDevices} />
            </ActionPanel.Section>
            <AccountActions />
        </ActionPanel>
    );
}

function DevicesList() {
    const { devices, isLoading, loadItems } = useDevicesContext();

    return (
        <List searchBarPlaceholder="Search device" isLoading={isLoading}>
            <List.EmptyView
                title="No Devices"
                actions={<AccountActionPanel reloadDevices={loadItems} />}
            />
            <List.Section title="Account">
                <List.Item
                    title="StarLine Account"
                    subtitle="Account-level API data and data transfer settings"
                    icon={Icon.Person}
                    actions={<AccountActionPanel reloadDevices={loadItems} />}
                />
            </List.Section>
            <List.Section title="Devices">
                {devices.map((device) => (
                    <DevicesItem key={device.device_id} item={device} />
                ))}
            </List.Section>
        </List>
    );
}

function DeviceComponent() {
    const { captchaImg, captchaSid } = useDevicesContext();

    if (hasText(captchaImg) && hasText(captchaSid)) {
        return <CaptchaForm captchaImg={captchaImg} captchaSid={captchaSid} />;
    }

    return <DevicesList />;
}

function DeviceCommand() {
    return (
        <StarLineProvider>
            <DevicesProvider>
                <DeviceComponent />
            </DevicesProvider>
        </StarLineProvider>
    );
}

export default DeviceCommand;
