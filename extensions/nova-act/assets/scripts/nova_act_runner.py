import json
import os
import sys
import subprocess
from typing import Optional
import venv
from pathlib import Path
import argparse


# Chain parents up so we store the venv in the extension's main directory, this way the venv doesn't get wiped on every re-build
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
VENV_DIR = ROOT_DIR / "venv"
LOGS_DIR = ROOT_DIR / "logs"


def create_venv(venv_dir):
    """Create a virtual environment and install nova-act."""
    print(
        "First time running Nova Act! Setting everything up, this might take a minute or so:"
    )
    print(f"Creating virtual environment at {venv_dir}...")
    venv.create(venv_dir, with_pip=True)

    # Get the path to pip in the new venv.
    pip_executable = os.path.join(venv_dir, "bin", "pip")
    print("Upgrading pip and installing nova-act...")
    subprocess.check_call([pip_executable, "install", "--upgrade", "pip"])

    subprocess.check_call([pip_executable, "install", "--upgrade", "nova-act"])
    print("Nova Act is now installed 🎉")


def load_return_schema(return_schema: Optional[str]):
    if return_schema is None:
        return None
    try:
        return_schema = json.loads(return_schema)
        return return_schema
    except json.JSONDecodeError:
        print(
            f"Invalid return schema: {return_schema}. Return schema must be a valid JSON object."
        )
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Run Nova Act")
    parser.add_argument("prompt", help="Task prompt is required")
    parser.add_argument(
        "--starting-page",
        default="https://www.google.com",
        help="Optional starting page URL",
    )
    parser.add_argument("--return-schema", default=None, help="Optional return schema")
    parser.add_argument("--headless", default=False, help="Run in headless mode")
    parser.add_argument(
        "--record-browser", default=False, help="Record browser session"
    )
    args = parser.parse_args()

    prompt = args.prompt
    starting_page = args.starting_page
    return_schema = load_return_schema(args.return_schema)
    headless = args.headless.lower() == "true"
    record_browser = args.record_browser.lower() == "true"

    logs_directory = str(LOGS_DIR)

    print(
        f"Starting Nova Act with starting page: {starting_page}, headless: {headless}, record_browser: {record_browser}, prompt: {prompt}",
        flush=True,
    )

    from nova_act import NovaAct

    with NovaAct(
        starting_page=starting_page,
        logs_directory=logs_directory,
        headless=headless,
        record_video=record_browser,
    ) as n:
        result = n.act(prompt, schema=return_schema)
        result_parsed = result.parsed_response
        print("::return_start::", flush=True)
        print(json.dumps(result_parsed), flush=True)
        print("::return_end::", flush=True)
        session_id = result.metadata.session_id
        print("::session_id_start::", flush=True)
        print(session_id, flush=True)
        print("::session_id_end::", flush=True)
        print("::logs_directory_start::", flush=True)
        current_run_logs_directory = f"{logs_directory}/{session_id}/"
        print(current_run_logs_directory, flush=True)
        print("::logs_directory_end::", flush=True)


if __name__ == "__main__":
    try:
        import nova_act  # noqa: F401
    except ImportError:
        if not VENV_DIR.exists():
            create_venv(VENV_DIR)
        venv_python = VENV_DIR / "bin" / "python"
        print(f"Launching using virtual environment: {venv_python}")
        os.execv(str(venv_python), [str(venv_python)] + sys.argv)
    else:
        main()
