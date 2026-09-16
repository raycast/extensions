# contextburn

Run efficiency of your Claude Code sessions, in Raycast.

Shows what share of the tokens you paid for became model output, how much was the agent re-reading context it
had already sent, and how many paid tokens one useful token costs.

## Requirements

Install the CLI: `pip install contextburn` — it reads the transcripts Claude Code already writes on your machine.
Nothing is sent anywhere.

Source and method: [github.com/arsentev-ai/contextburn](https://github.com/arsentev-ai/contextburn).

## Method

The metric comes from a controlled measurement of agentic coding sessions: across the measured runs 87.8% of
paid tokens were context and 12.2% were generation, re-reading context ran 4.59x the model's own output, and
80% of the spend came from 2.9% of sessions. Reports:
[10.5281/zenodo.22759216](https://doi.org/10.5281/zenodo.22759216) and
[10.5281/zenodo.22759217](https://doi.org/10.5281/zenodo.22759217).
