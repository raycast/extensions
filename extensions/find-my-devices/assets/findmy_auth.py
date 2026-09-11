#!/usr/bin/env python3
"""Interactive iCloud web sign-in without Keychain access."""

from __future__ import annotations

import argparse
import getpass
import os
import sys

os.environ.setdefault("PYTHON_KEYRING_BACKEND", "keyring.backends.null.Keyring")

from pyicloud import PyiCloudService
from pyicloud.exceptions import PyiCloudException, PyiCloudFailedLoginException


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Find My Devices sign-in")
    result.add_argument("--apple-account", required=True)
    result.add_argument("--session-dir", required=True)
    return result


def complete_two_factor_authentication(api: PyiCloudService) -> None:
    if not api.requires_2fa:
        return

    if not api.request_2fa_code():
        raise RuntimeError(
            "This Apple Account requires a security key, which this setup does not support."
        )

    notice = getattr(api, "two_factor_delivery_notice", None)
    if notice:
        print(notice)

    delivery = getattr(api, "two_factor_delivery_method", "unknown")
    if delivery == "trusted_device":
        print("Apple requested a verification code on a trusted device.")
    elif delivery == "sms":
        print("Apple requested a verification code by SMS.")
    else:
        print("Apple requested a verification code.")

    for attempts_remaining in range(2, -1, -1):
        code = getpass.getpass("Enter the newest six-digit verification code: ").strip()
        if api.validate_2fa_code(code):
            return
        if attempts_remaining:
            print(f"Apple rejected that code. {attempts_remaining} attempt(s) remain.")
    raise RuntimeError("Apple rejected the verification code three times.")


def main() -> None:
    args = parser().parse_args()
    login_value = getpass.getpass("Enter the Apple Account password: ")
    if not login_value:
        raise RuntimeError("A password is required.")

    try:
        api = PyiCloudService(
            args.apple_account,
            login_value,
            cookie_directory=args.session_dir,
            with_family=True,
        )
    finally:
        login_value = ""

    complete_two_factor_authentication(api)
    if api.requires_2sa:
        raise RuntimeError("This Apple Account requires an unsupported two-step authentication flow.")

    status = api.get_auth_status()
    if not status.get("authenticated") or not status.get("trusted_session"):
        raise RuntimeError("Apple did not create a trusted web session.")

    print("Apple web sign-in is complete.")


if __name__ == "__main__":
    try:
        main()
    except PyiCloudFailedLoginException:
        print("Apple rejected the account name or password.", file=sys.stderr)
        raise SystemExit(2)
    except (PyiCloudException, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(3)
