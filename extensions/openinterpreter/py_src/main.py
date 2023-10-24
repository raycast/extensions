import interpreter
import sys
import json
import os

# Required to patch open-interpreter's incorrect check of the current python interpreter
# god Killian, why didn't you assume that I would bundle my entire environment into a single file?????? (jk ily)
sys.executable = "python3"

interpreter.model = os.environ.get("MODEL", "gpt-3.5-turbo")
interpreter.auto_run = False
interpreter.max_budget = os.environ.get("MAX_BUDGET", 100)
interpreter.debug_mode = bool(os.environ.get("DEBUG_MODE", False))

interpreter.system_message += ""

while True:
    command = input() # Get the next command
    res = interpreter.chat(command, display=False, stream=True) # Executes a single command
    print(res, flush=True, file=sys.stderr)

    did_run = False
    for chunk in res:
        did_run = True
        print(json.dumps(chunk), flush=True)

    if not did_run:
        print("Command failed to run", flush=True, file=sys.stderr)
    else:
        print("Command finished", flush=True, file=sys.stderr)
    # print("Command executed!" + json.dumps(res), flush=True, file=sys.stderr)
