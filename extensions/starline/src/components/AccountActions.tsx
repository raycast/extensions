import { Action, ActionPanel, Icon } from "@raycast/api";

import AccountApiDetail from "./AccountApiDetail";
import DataTransferForm from "./DataTransferForm";

function AccountActions() {
    return (
        <ActionPanel.Section title="Account">
            <Action.Push
                title="Show User Devices"
                icon={Icon.Person}
                target={<AccountApiDetail kind="userDevices" title="User Devices" />}
            />
            <Action.Push
                title="Show Device List"
                icon={Icon.List}
                target={<AccountApiDetail kind="deviceList" title="Device List" />}
            />
            <Action.Push
                title="Show Mobile Devices"
                icon={Icon.Mobile}
                target={<AccountApiDetail kind="mobileDevices" title="Mobile Devices" />}
            />
            <Action.Push title="Manage Data Transfer" icon={Icon.Network} target={<DataTransferForm />} />
        </ActionPanel.Section>
    );
}

export default AccountActions;
