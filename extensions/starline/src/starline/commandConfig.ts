import { Alert, Icon, type Image, type Keyboard } from "@raycast/api";

import type { StarLine } from "./api";
import type { Item } from "../types/devices";

type CommandConfirmation = {
    title: string;
    message?: string;
    primaryActionTitle?: string;
    style?: Alert.ActionStyle;
};

export type DeviceCommandConfig = {
    title: string;
    icon?: Image.ImageLike;
    shortcut?: Keyboard.Shortcut;
    successMessage: string;
    supportCommand?: string;
    confirmation?: CommandConfirmation;
    updatesArmState?: boolean;
    run: (starline: StarLine, deviceId: string, item?: Item) => Promise<unknown>;
};

const destructiveConfirmation = (
    title: string,
    message: string,
    primaryActionTitle: string,
): CommandConfirmation => ({
    title,
    message,
    primaryActionTitle,
    style: Alert.ActionStyle.Destructive,
});

const deviceCommand = (
    title: string,
    successMessage: string,
    run: DeviceCommandConfig["run"],
    options: Omit<DeviceCommandConfig, "title" | "successMessage" | "run"> = {},
): DeviceCommandConfig => ({ title, successMessage, run, ...options });

export const DEVICE_ACTIONS = {
    arm: deviceCommand("Arm", "Armed", (starline, deviceId) => starline.arm(deviceId), {
        icon: Icon.Lock,
        supportCommand: "arm_start",
        updatesArmState: true,
    }),
    startEngine: deviceCommand(
        "Start Engine",
        "Engine started",
        (starline, deviceId) => starline.startEngine(deviceId),
        {
            icon: Icon.Play,
            supportCommand: "ign_start",
            shortcut: { modifiers: ["cmd"], key: "return" },
            confirmation: {
                title: "Start engine?",
                message: "Make sure it is safe to start the engine remotely.",
                primaryActionTitle: "Start Engine",
            },
        },
    ),
    disarm: deviceCommand("Disarm", "Disarmed", (starline, deviceId) => starline.disarm(deviceId), {
        icon: Icon.LockUnlocked,
        supportCommand: "arm_stop",
        shortcut: { modifiers: ["cmd"], key: "d" },
        confirmation: destructiveConfirmation(
            "Disarm vehicle?",
            "This will disable security mode for the selected device.",
            "Disarm",
        ),
        updatesArmState: true,
    }),
    stopEngine: deviceCommand(
        "Stop Engine",
        "Engine stopped",
        (starline, deviceId) => starline.stopEngine(deviceId),
        {
            icon: Icon.Stop,
            supportCommand: "ign_stop",
            shortcut: { modifiers: ["cmd"], key: "s" },
            confirmation: destructiveConfirmation(
                "Stop engine?",
                "This will stop the engine remotely.",
                "Stop Engine",
            ),
        },
    ),
    armQuietly: deviceCommand(
        "Arm Quietly",
        "Armed quietly",
        (starline, deviceId) => starline.armQuietly(deviceId),
        {
            icon: Icon.Lock,
            supportCommand: "arm_start_quiet",
            updatesArmState: true,
        },
    ),
    disarmQuietly: deviceCommand(
        "Disarm Quietly",
        "Disarmed quietly",
        (starline, deviceId) => starline.disarmQuietly(deviceId),
        {
            icon: Icon.LockUnlocked,
            supportCommand: "arm_stop_quiet",
            confirmation: destructiveConfirmation(
                "Disarm quietly?",
                "This will disable security mode without sound confirmation.",
                "Disarm Quietly",
            ),
            updatesArmState: true,
        },
    ),
    shockSensorBypass: deviceCommand(
        "Shock Sensor Bypass",
        "Shock sensor bypassed",
        (starline, deviceId) => starline.shockSensorBypass(deviceId),
        { icon: Icon.BoltDisabled, supportCommand: "shock_bpass" },
    ),
    tiltSensorBypass: deviceCommand(
        "Tilt Sensor Bypass",
        "Tilt sensor bypassed",
        (starline, deviceId) => starline.tiltSensorBypass(deviceId),
        { icon: Icon.ClearFormatting, supportCommand: "tilt_bpass" },
    ),
    additionalSensorBypass: deviceCommand(
        "Additional Sensor Bypass",
        "Additional sensor bypassed",
        (starline, deviceId) => starline.additionalSensorBypass(deviceId),
        { icon: Icon.LivestreamDisabled, supportCommand: "add_sens_bpass" },
    ),
    serviceModeEnable: deviceCommand(
        "Enable Service Mode",
        "Service mode enabled",
        (starline, deviceId) => starline.serviceModeEnable(deviceId),
        { supportCommand: "valet" },
    ),
    serviceModeDisable: deviceCommand(
        "Disable Service Mode",
        "Service mode disabled",
        (starline, deviceId) => starline.serviceModeDisable(deviceId),
        { supportCommand: "valet" },
    ),
    horn: deviceCommand(
        "Horn",
        "Horn command sent",
        (starline, deviceId) => starline.horn(deviceId),
        {
            icon: Icon.SpeakerUp,
            supportCommand: "poke",
        },
    ),
    updatePosition: deviceCommand(
        "Update Position",
        "Position update requested",
        (starline, deviceId) => starline.updatePosition(deviceId),
        { icon: Icon.Map, supportCommand: "update_position" },
    ),
} satisfies Record<string, DeviceCommandConfig>;

export type DeviceActionKey = keyof typeof DEVICE_ACTIONS;

export const PRIMARY_DEVICE_ACTIONS = Object.keys(DEVICE_ACTIONS);

export const ADVANCED_DEVICE_ACTIONS = {
    handsFreeEnable: deviceCommand(
        "Enable Hands Free",
        "Hands Free enabled",
        (starline, deviceId) => starline.setHandsFree(deviceId, true),
        { icon: Icon.Person, supportCommand: "hfree" },
    ),
    handsFreeDisable: deviceCommand(
        "Disable Hands Free",
        "Hands Free disabled",
        (starline, deviceId) => starline.setHandsFree(deviceId, false),
        { icon: Icon.Person, supportCommand: "hfree" },
    ),
    disarmTrunk: deviceCommand(
        "Disarm Trunk",
        "Trunk disarmed",
        (starline, deviceId) => starline.disarmTrunk(deviceId),
        {
            icon: Icon.LockUnlocked,
            supportCommand: "disarm_trunk",
            confirmation: destructiveConfirmation(
                "Disarm trunk?",
                "This will disable trunk security for the selected device.",
                "Disarm Trunk",
            ),
        },
    ),
    panic: deviceCommand(
        "Panic",
        "Panic mode triggered",
        (starline, deviceId) => starline.panic(deviceId),
        {
            icon: Icon.ExclamationMark,
            supportCommand: "panic",
            confirmation: destructiveConfirmation(
                "Trigger panic mode?",
                "This will enable alarm mode for 15 seconds.",
                "Trigger Panic",
            ),
        },
    ),
    getSim1Balance: deviceCommand(
        "Get SIM 1 Balance",
        "SIM 1 balance requested",
        (starline, deviceId) => starline.getBalance(deviceId, 1),
        { icon: Icon.CreditCard, supportCommand: "getbalance" },
    ),
    getSim2Balance: deviceCommand(
        "Get SIM 2 Balance",
        "SIM 2 balance requested",
        (starline, deviceId) => starline.getBalance(deviceId, 2),
        { icon: Icon.CreditCard, supportCommand: "getbalance" },
    ),
    outputEnable: deviceCommand(
        "Enable Output",
        "Output enabled",
        (starline, deviceId) => starline.setOutput(deviceId, true),
        { icon: Icon.Bolt, supportCommand: "out" },
    ),
    outputDisable: deviceCommand(
        "Disable Output",
        "Output disabled",
        (starline, deviceId) => starline.setOutput(deviceId, false),
        { icon: Icon.BoltDisabled, supportCommand: "out" },
    ),
    dvrEnable: deviceCommand(
        "Enable DVR",
        "DVR enabled",
        (starline, deviceId) => starline.setDvr(deviceId, true),
        { icon: Icon.Video, supportCommand: "dvr" },
    ),
    dvrDisable: deviceCommand(
        "Disable DVR",
        "DVR disabled",
        (starline, deviceId) => starline.setDvr(deviceId, false),
        { icon: Icon.Video, supportCommand: "dvr" },
    ),
    webastoEnable: deviceCommand(
        "Enable Webasto",
        "Webasto enabled",
        (starline, deviceId) => starline.setWebasto(deviceId, true),
        { icon: Icon.Gear, supportCommand: "webasto" },
    ),
    webastoDisable: deviceCommand(
        "Disable Webasto",
        "Webasto disabled",
        (starline, deviceId) => starline.setWebasto(deviceId, false),
        { icon: Icon.Gear, supportCommand: "webasto" },
    ),
    webastoOn: deviceCommand(
        "Webasto On",
        "Webasto turned on",
        (starline, deviceId) => starline.webastoOn(deviceId),
        { icon: Icon.Gear, supportCommand: "webasto_on" },
    ),
    webastoOff: deviceCommand(
        "Webasto Off",
        "Webasto turned off",
        (starline, deviceId) => starline.webastoOff(deviceId),
        { icon: Icon.Gear, supportCommand: "webasto_off" },
    ),
    flex1: deviceCommand(
        "Flex 1",
        "Flex 1 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 1),
        { icon: Icon.CommandSymbol, supportCommand: "flex_1" },
    ),
    flex2: deviceCommand(
        "Flex 2",
        "Flex 2 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 2),
        { icon: Icon.CommandSymbol, supportCommand: "flex_2" },
    ),
    flex3: deviceCommand(
        "Flex 3",
        "Flex 3 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 3),
        { icon: Icon.CommandSymbol, supportCommand: "flex_3" },
    ),
    flex4: deviceCommand(
        "Flex 4",
        "Flex 4 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 4),
        { icon: Icon.CommandSymbol, supportCommand: "flex_4" },
    ),
    flex5: deviceCommand(
        "Flex 5",
        "Flex 5 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 5),
        { icon: Icon.CommandSymbol, supportCommand: "flex_5" },
    ),
    flex6: deviceCommand(
        "Flex 6",
        "Flex 6 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 6),
        { icon: Icon.CommandSymbol, supportCommand: "flex_6" },
    ),
    flex7: deviceCommand(
        "Flex 7",
        "Flex 7 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 7),
        { icon: Icon.CommandSymbol, supportCommand: "flex_7" },
    ),
    flex8: deviceCommand(
        "Flex 8",
        "Flex 8 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 8),
        { icon: Icon.CommandSymbol, supportCommand: "flex_8" },
    ),
    flex9: deviceCommand(
        "Flex 9",
        "Flex 9 sent",
        (starline, deviceId) => starline.runFlexCommand(deviceId, 9),
        { icon: Icon.CommandSymbol, supportCommand: "flex_9" },
    ),
} satisfies Record<string, DeviceCommandConfig>;

export const ADVANCED_DEVICE_ACTION_KEYS = Object.keys(ADVANCED_DEVICE_ACTIONS);
