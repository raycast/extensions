#!/usr/bin/env python3
"""Restricted bridge between Raycast and PyiCloud Find My device actions."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

os.environ.setdefault("PYTHON_KEYRING_BACKEND", "keyring.backends.null.Keyring")

from pyicloud import PyiCloudService
from pyicloud.exceptions import (
    PyiCloudAuthRequiredException,
    PyiCloudException,
    PyiCloudNoDevicesException,
    PyiCloudServiceUnavailable,
)


class BridgeFailure(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def emit(payload: dict[str, Any], *, error: bool = False) -> None:
    target = sys.stderr if error else sys.stdout
    target.write(json.dumps(payload, separators=(",", ":")) + "\n")


def text(value: Any) -> str | None:
    if value is None:
        return None
    result = str(value).strip()
    return result or None


def member_name(member: Any) -> str | None:
    if not isinstance(member, dict):
        return None
    direct = text(member.get("fullName") or member.get("name") or member.get("memberName"))
    if direct:
        return direct
    parts = [text(member.get("firstName") or member.get("givenName")), text(member.get("lastName") or member.get("familyName"))]
    joined = " ".join(part for part in parts if part)
    return joined or None


def owner_map(user_info: dict[str, Any]) -> dict[str, str]:
    owners: dict[str, str] = {}
    members = user_info.get("membersInfo")
    if not isinstance(members, dict):
        return owners

    for key, member in members.items():
        if not isinstance(member, dict):
            continue
        name = member_name(member)
        if not name:
            continue
        identifiers = [key, member.get("dsid"), member.get("prsId"), member.get("appleId")]
        for identifier in identifiers:
            normalized = text(identifier)
            if normalized:
                owners[normalized] = name
    return owners


def authenticated_api(apple_account: str, session_dir: str, include_family: bool) -> PyiCloudService:
    api = PyiCloudService(
        apple_account,
        password=None,
        cookie_directory=session_dir,
        with_family=include_family,
        authenticate=False,
    )
    status = api.get_auth_status()
    if not status.get("authenticated") or status.get("requires_2fa") or status.get("requires_2sa"):
        raise BridgeFailure("AUTH_REQUIRED", "The saved Apple web session is missing, expired, or needs two-factor authentication.")
    return api


def list_devices(args: argparse.Namespace) -> None:
    include_family = args.include_family == "true"
    api = authenticated_api(args.apple_account, args.session_dir, include_family)
    manager = api.devices
    user_info = dict(manager.user_info or {})
    owners = owner_map(user_info)
    current_dsid = text(api.params.get("dsid"))

    devices: list[dict[str, Any]] = []
    for device in manager:
        raw = dict(device.data)
        owner_id = text(raw.get("prsId") or raw.get("dsid") or raw.get("ownerDsid"))
        is_family = bool(raw.get("fmlyShare")) or bool(owner_id and current_dsid and owner_id != current_dsid)
        owner = owners.get(owner_id or "")
        if not owner:
            owner = "Family Devices" if is_family else "My Devices"

        devices.append(
            {
                "id": text(raw.get("id")) or "",
                "name": text(raw.get("name")) or text(raw.get("deviceDisplayName")) or "Unknown Device",
                "displayName": text(raw.get("deviceDisplayName")),
                "deviceClass": text(raw.get("deviceClass")),
                "deviceModel": text(raw.get("deviceModel")),
                "batteryLevel": raw.get("batteryLevel") if isinstance(raw.get("batteryLevel"), (int, float)) else None,
                "batteryStatus": text(raw.get("batteryStatus")),
                "soundAvailable": bool(device.sound_available),
                "owner": owner,
                "ownerId": owner_id,
                "isFamily": is_family,
            }
        )

    emit({"ok": True, "devices": devices})


def sound_device(args: argparse.Namespace) -> None:
    api = authenticated_api(args.apple_account, args.session_dir, True)
    selected = None
    for device in api.devices:
        if text(device.id) == args.device_id:
            selected = device
            break
    if selected is None:
        raise BridgeFailure("DEVICE_NOT_FOUND", "Apple did not return the selected device. Refresh the device list and try again.")
    if not selected.sound_available:
        raise BridgeFailure("SOUND_UNAVAILABLE", "Apple reports that Play Sound is not available for this device.")
    selected.play_sound(subject=args.subject)
    emit({"ok": True, "deviceId": args.device_id})


def logout(args: argparse.Namespace) -> None:
    session_path = Path(args.session_dir).expanduser().resolve()
    if len(session_path.parts) < 5 or session_path == Path.home().resolve():
        raise BridgeFailure("INVALID_REQUEST", "Refusing to clear an unsafe session path.")

    remote_confirmed = False
    try:
        try:
            api = PyiCloudService(
                args.apple_account,
                password=None,
                cookie_directory=str(session_path),
                authenticate=False,
            )
            status = api.get_auth_status()
            if status.get("authenticated"):
                result = api.logout(clear_local_session=True)
                remote_confirmed = bool(result.get("remote_logout_confirmed"))
        except Exception:  # Remote sign-out is best effort. Local removal must still succeed.
            remote_confirmed = False
    finally:
        shutil.rmtree(session_path, ignore_errors=True)

    emit({"ok": True, "remoteLogoutConfirmed": remote_confirmed})


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Restricted Find My bridge")
    result.add_argument("command", choices=("list", "sound", "logout"))
    result.add_argument("--apple-account", required=True)
    result.add_argument("--session-dir", required=True)
    result.add_argument("--include-family", choices=("true", "false"), default="true")
    result.add_argument("--device-id")
    result.add_argument("--subject", default="Find My Alert")
    return result


def main() -> None:
    args = parser().parse_args()
    if args.command == "list":
        list_devices(args)
    elif args.command == "sound":
        if not args.device_id:
            raise BridgeFailure("INVALID_REQUEST", "A device identifier is required.")
        sound_device(args)
    else:
        logout(args)


if __name__ == "__main__":
    try:
        main()
    except BridgeFailure as error:
        emit({"ok": False, "code": error.code, "message": error.message}, error=True)
        raise SystemExit(2)
    except PyiCloudNoDevicesException:
        emit({"ok": False, "code": "NO_DEVICES", "message": "Apple returned no Find My devices."}, error=True)
        raise SystemExit(3)
    except PyiCloudAuthRequiredException:
        emit({"ok": False, "code": "AUTH_REQUIRED", "message": "The Apple web session needs sign-in again."}, error=True)
        raise SystemExit(4)
    except PyiCloudServiceUnavailable as error:
        emit({"ok": False, "code": "SOUND_UNAVAILABLE", "message": str(error)}, error=True)
        raise SystemExit(5)
    except PyiCloudException as error:
        emit({"ok": False, "code": "PYICLOUD_ERROR", "message": str(error)}, error=True)
        raise SystemExit(6)
    except Exception as error:
        emit({"ok": False, "code": "NETWORK_ERROR", "message": str(error)}, error=True)
        raise SystemExit(7)
