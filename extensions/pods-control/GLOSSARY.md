# Pods Control

A Raycast extension that reads and changes the listening mode and Conversation Awareness of connected AirPods or Beats, and shows the confirmed state in command subtitles.

## Device

**Device**:
The one pair of AirPods or Beats connected to the Mac that the extension controls.
_Avoid_: pods, headphones, earbuds, "AirPods" when Beats are included too

**Compatible device**:
An AirPods or Beats model that the CLI can control.
_Avoid_: supported device

**Not connected**:
The state where no compatible device is connected to the Mac.
_Avoid_: no device, disconnected

**Multiple devices connected**:
The state where more than one compatible device is connected, so the extension does not know which one to control.
_Avoid_: ambiguous device

**Supported**:
Describes a listening mode or Conversation Awareness that the device's model and firmware can use.
_Avoid_: available, compatible

**Unavailable**:
The state where macOS does not expose the device's features at all, for example because the device is not the audio output.
_Avoid_: not supported (for this state)

## Features

**Feature**:
A setting on the device that the extension can read and change: the listening mode or Conversation Awareness.
_Avoid_: control, listening setting, listening control

**Listening mode**:
The feature that decides how much outside sound the device lets through. Its values are Off, Transparency, Adaptive, and Noise Cancellation.
_Avoid_: noise control, noise mode, ANC mode

**Listening mode order**:
The fixed order Off, Transparency, Adaptive, Noise Cancellation, which cycling follows.

**Noise Cancellation**:
The listening mode that blocks outside sound.
_Avoid_: ANC, NC, noise cancelling

**Transparency**:
The listening mode that lets outside sound through.
_Avoid_: ambient, passthrough

**Adaptive**:
The listening mode that blends Noise Cancellation and Transparency based on the surroundings. Only some devices support it.
_Avoid_: Adaptive Audio, auto, automatic

**Off**:
The listening mode with neither Noise Cancellation nor Transparency. The device can use it only when Off Listening Mode is on.
_Avoid_: disabled, none

**Off Listening Mode**:
Apple's device setting that, when on, includes Off among the device's listening modes.
_Avoid_: Off allowed, Off enabled, noise control options

**Conversation Awareness**:
The feature that lowers media volume and outside noise when the user starts speaking. Its values are On and Off.
_Avoid_: Conversational Awareness, CA (except in the compact status subtitle)

**Confirmed state**:
The value of a feature as macOS reports it after a read or a change. The extension shows and reports only confirmed states.
_Avoid_: current state, requested state

**Set**:
To change a feature to a specific value: a listening mode, or Conversation Awareness On or Off.
_Avoid_: apply, switch, enable, disable

## Commands

**Control command**:
A command that changes a feature: a set command, Cycle Listening Mode, or Toggle Conversation Awareness.

**Set command**:
A command that changes the listening mode to one fixed value, such as **Set to Transparency**.
_Avoid_: fixed-mode command

**Cycle**:
To change the listening mode to the next enabled listening mode after the confirmed one in listening mode order, wrapping around and skipping modes the device does not support.
_Avoid_: rotate, switch

**Enabled listening mode**:
A listening mode the user enables in **Modes to Cycle Through**, so cycling can reach it. At least two must be enabled.
_Avoid_: cycle mode, selected mode, preferred mode, checked mode

**Toggle**:
To change Conversation Awareness to the opposite of its confirmed state.
_Avoid_: switch, flip

## Subtitles

**Subtitle**:
The text Raycast shows next to a command, used to display a confirmed state.

**Feature subtitle**:
The subtitle of Cycle Listening Mode or Toggle Conversation Awareness, showing the confirmed state of one feature.
_Avoid_: control subtitle

**Status subtitle**:
The subtitle of Pods Status, combining the confirmed listening mode and Conversation Awareness.
_Avoid_: combined subtitle

**Default subtitle**:
The subtitle "Pods Control", shown when a command has no confirmed state to display.

**Status refresh**:
Reading the device's state and updating every subtitle with the result. This is what Pods Status is for.
_Avoid_: status read, status update, sync

## CLI

**CLI**:
The pods-control CLI, the command-line tool the extension runs to talk to the device.
_Avoid_: Pods Control CLI, helper, binary

**CLI Path**:
The extension preference that points to the CLI and replaces automatic detection.
_Avoid_: custom path, configured path

**CLI setup**:
Detecting, installing, updating, or repairing the CLI. The **Manage CLI** command is where the user does it.
_Avoid_: onboarding, installation (for the whole process)

**Install method**:
How the CLI was installed: a Homebrew install or a source install.

**Homebrew install**:
A CLI installed and owned by the Homebrew formula `raulgg/tap/pods-control`.

**Source install**:
A CLI built from source on the Mac rather than owned by Homebrew.
_Avoid_: manual install, manual CLI

**Minimum CLI version**:
The oldest CLI version the extension works with.
_Avoid_: required version

**Latest release**:
The newest published CLI version, as reported by Homebrew or GitHub.
_Avoid_: latest version, newest version
